use axum::{
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde::Deserialize;
use sqlx::PgPool;
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::media::*;
use crate::response::ApiResponse;

/// Base directory for stored files, relative to CWD (the binary is run from
/// the `backend/` workspace root in development).
const UPLOADS_DIR: &str = "uploads";

/// Ensure `uploads/{workspace_id}/` directory exists and return its path.
async fn ensure_upload_dir(workspace_id: &Uuid) -> Result<PathBuf, AppError> {
    let dir = PathBuf::from(UPLOADS_DIR).join(workspace_id.to_string());
    fs::create_dir_all(&dir).await.map_err(|e| {
        AppError::Internal(format!("Failed to create upload directory: {e}"))
    })?;
    Ok(dir)
}

// ---------------------------------------------------------------------------
// POST /api/v1/media/upload — multipart file upload
// ---------------------------------------------------------------------------
async fn upload_media(
    auth: AuthUser,
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<Media>>, AppError> {
    // Collect fields from the multipart form
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut original_filename: Option<String> = None;
    let mut mime_type: Option<String> = None;
    let mut note_id: Option<Uuid> = None;
    let mut media_type_str: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::BadRequest(format!("Multipart error: {e}"))
    })? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                original_filename = field.file_name().map(|s| s.to_string());
                mime_type = field.content_type().map(|s| s.to_string());
                file_bytes = Some(field.bytes().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read file bytes: {e}"))
                })?.to_vec());
            }
            "note_id" => {
                let text = field.text().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read note_id: {e}"))
                })?;
                note_id = Uuid::parse_str(text.trim()).ok();
            }
            "media_type" => {
                media_type_str = Some(field.text().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read media_type: {e}"))
                })?);
            }
            _ => {
                // Drain unknown fields
                let _ = field.bytes().await;
            }
        }
    }

    let file_bytes = file_bytes.ok_or_else(|| AppError::BadRequest("No file provided".to_string()))?;
    let media_type_str = media_type_str.unwrap_or_else(|| "photo".to_string());
    let file_size_bytes = file_bytes.len() as i64;

    // Determine file extension
    let ext = original_filename
        .as_deref()
        .and_then(|f| f.rsplit('.').next())
        .unwrap_or_else(|| match media_type_str.as_str() {
            "audio" => "webm",
            _ => "jpg",
        })
        .to_string();

    // Build storage path
    let workspace_id = auth.workspace_id;
    let file_id = Uuid::new_v4();
    let filename = format!("{file_id}.{ext}");
    let upload_dir = ensure_upload_dir(&workspace_id).await?;
    let file_path = upload_dir.join(&filename);
    let s3_key = format!("{}/{}", workspace_id, filename);

    // Write file to disk
    fs::write(&file_path, &file_bytes).await.map_err(|e| {
        AppError::Internal(format!("Failed to write file: {e}"))
    })?;

    // Infer mime type if not provided by client
    let resolved_mime = mime_type.or_else(|| {
        Some(mime_guess::from_path(&filename)
            .first_or_octet_stream()
            .to_string())
    });

    // Insert record
    let media = sqlx::query_as::<_, Media>(
        "INSERT INTO media (note_id, media_type, s3_key, original_filename, mime_type, \
         file_size_bytes, sort_order) \
         VALUES ($1, $2::media_type, $3, $4, $5, $6, 0) \
         RETURNING id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at",
    )
    .bind(note_id)
    .bind(&media_type_str)
    .bind(&s3_key)
    .bind(&original_filename)
    .bind(&resolved_mime)
    .bind(file_size_bytes)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(media))
}

// ---------------------------------------------------------------------------
// GET /api/v1/media/:id/file — serve the file (supports Range for audio)
// ---------------------------------------------------------------------------
async fn serve_file(
    _auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<(StatusCode, HeaderMap, Body), AppError> {
    let record = sqlx::query_as::<_, Media>(
        "SELECT id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at \
         FROM media WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Media not found".to_string()))?;

    let file_path = PathBuf::from(UPLOADS_DIR).join(&record.s3_key);

    let file_bytes = fs::read(&file_path).await.map_err(|_| {
        AppError::NotFound(format!("File not found on disk: {}", record.s3_key))
    })?;

    let content_type = record
        .mime_type
        .as_deref()
        .unwrap_or("application/octet-stream")
        .to_string();

    let total_len = file_bytes.len() as u64;

    // Parse optional Range header (e.g. "bytes=0-1023")
    let range_header = headers
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("bytes="))
        .map(|s| s.to_string());

    let mut resp_headers = HeaderMap::new();
    resp_headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&content_type).unwrap_or_else(|_| {
            HeaderValue::from_static("application/octet-stream")
        }),
    );
    resp_headers.insert(
        header::ACCEPT_RANGES,
        HeaderValue::from_static("bytes"),
    );

    if let Some(range_str) = range_header {
        // Parse "start-end" (end is optional)
        let parts: Vec<&str> = range_str.splitn(2, '-').collect();
        let start: u64 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
        let end: u64 = parts
            .get(1)
            .and_then(|s| if s.is_empty() { None } else { s.parse().ok() })
            .unwrap_or(total_len.saturating_sub(1))
            .min(total_len.saturating_sub(1));

        if start > end || start >= total_len {
            return Ok((
                StatusCode::RANGE_NOT_SATISFIABLE,
                resp_headers,
                Body::empty(),
            ));
        }

        let chunk = file_bytes[start as usize..=end as usize].to_vec();
        let chunk_len = chunk.len() as u64;

        resp_headers.insert(
            header::CONTENT_RANGE,
            HeaderValue::from_str(&format!("bytes {start}-{end}/{total_len}"))
                .unwrap_or_else(|_| HeaderValue::from_static("bytes 0-0/0")),
        );
        resp_headers.insert(
            header::CONTENT_LENGTH,
            HeaderValue::from_str(&chunk_len.to_string())
                .unwrap_or_else(|_| HeaderValue::from_static("0")),
        );

        Ok((StatusCode::PARTIAL_CONTENT, resp_headers, Body::from(chunk)))
    } else {
        resp_headers.insert(
            header::CONTENT_LENGTH,
            HeaderValue::from_str(&total_len.to_string())
                .unwrap_or_else(|_| HeaderValue::from_static("0")),
        );
        Ok((StatusCode::OK, resp_headers, Body::from(file_bytes)))
    }
}

// ---------------------------------------------------------------------------
// GET /api/v1/media?note_id=X[&type=photo|audio]
// ---------------------------------------------------------------------------
#[derive(Debug, Deserialize)]
struct ListMediaQuery {
    note_id: Option<Uuid>,
    #[serde(rename = "type")]
    media_type: Option<String>,
}

async fn list_media(
    _auth: AuthUser,
    State(pool): State<PgPool>,
    Query(params): Query<ListMediaQuery>,
) -> Result<Json<ApiResponse<Vec<Media>>>, AppError> {
    // Build WHERE clause dynamically
    let mut conditions: Vec<String> = Vec::new();
    let mut bind_idx = 1usize;

    if params.note_id.is_some() {
        conditions.push(format!("note_id = ${bind_idx}"));
        bind_idx += 1;
    }
    if params.media_type.is_some() {
        conditions.push(format!("media_type::text = ${bind_idx}"));
        // bind_idx += 1; -- would be used if more params follow
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at \
         FROM media {where_clause} ORDER BY sort_order ASC, created_at ASC"
    );

    let mut query = sqlx::query_as::<_, Media>(&sql);
    if let Some(nid) = params.note_id {
        query = query.bind(nid);
    }
    if let Some(mt) = &params.media_type {
        query = query.bind(mt);
    }

    let items = query.fetch_all(&pool).await?;
    let total = items.len() as i64;

    Ok(ApiResponse::list(items, total, 1, 200))
}

// ---------------------------------------------------------------------------
// GET /api/v1/media/:id — get single media record
// ---------------------------------------------------------------------------
async fn get_media(
    _auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Media>>, AppError> {
    let media = sqlx::query_as::<_, Media>(
        "SELECT id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at \
         FROM media WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Media not found".to_string()))?;

    Ok(ApiResponse::ok(media))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/media/:id — delete file + DB record
// ---------------------------------------------------------------------------
async fn delete_media(
    _auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    // Fetch s3_key first so we can delete the file
    let record = sqlx::query_as::<_, Media>(
        "SELECT id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at \
         FROM media WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Media not found".to_string()))?;

    // Delete from DB
    sqlx::query("DELETE FROM media WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    // Best-effort delete from disk
    let file_path = PathBuf::from(UPLOADS_DIR).join(&record.s3_key);
    let _ = fs::remove_file(&file_path).await;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// PUT /api/v1/media/:id/transcription — update transcription
// ---------------------------------------------------------------------------
async fn update_transcription(
    _auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTranscription>,
) -> Result<Json<ApiResponse<Media>>, AppError> {
    let media = sqlx::query_as::<_, Media>(
        "UPDATE media SET \
         transcription_status = $2::transcription_status, \
         transcription_text = COALESCE($3, transcription_text) \
         WHERE id = $1 \
         RETURNING id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at",
    )
    .bind(id)
    .bind(&body.status)
    .bind(&body.text)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Media not found".to_string()))?;

    Ok(ApiResponse::ok(media))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        // Static routes BEFORE parameterized ones (Axum routing order rule)
        .route("/api/v1/media/upload", post(upload_media))
        .route("/api/v1/media", get(list_media))
        .route("/api/v1/media/{id}/file", get(serve_file))
        .route("/api/v1/media/{id}/transcription", put(update_transcription))
        .route("/api/v1/media/{id}", get(get_media).delete(delete_media))
}
