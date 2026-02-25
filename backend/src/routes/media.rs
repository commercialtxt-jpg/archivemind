use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::media::*;
use crate::response::ApiResponse;

async fn presign_upload(
    _auth: AuthUser,
    Json(body): Json<PresignRequest>,
) -> Result<Json<ApiResponse<PresignResponse>>, AppError> {
    // Generate S3 key
    let ext = body.filename.rsplit('.').next().unwrap_or("bin");
    let s3_key = format!("media/{}/{}.{}", body.note_id, Uuid::new_v4(), ext);

    // TODO: Integrate with actual S3/R2 client for presigned URLs
    // For now, return the key so the frontend knows where the file will be stored
    let upload_url = format!("https://s3.placeholder.local/{}", s3_key);

    Ok(ApiResponse::ok(PresignResponse { upload_url, s3_key }))
}

async fn create_media(
    _auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateMedia>,
) -> Result<Json<ApiResponse<Media>>, AppError> {
    let sort_order = body.sort_order.unwrap_or(0);

    let media = sqlx::query_as::<_, Media>(
        "INSERT INTO media (note_id, media_type, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, sort_order) \
         VALUES ($1, $2::media_type, $3, $4, $5, $6, $7, $8, $9, $10) \
         RETURNING id, note_id, media_type::text, s3_key, original_filename, mime_type, \
         file_size_bytes, duration_seconds, thumbnail_s3_key, label, \
         transcription_status::text, transcription_text, sort_order, created_at",
    )
    .bind(body.note_id)
    .bind(&body.media_type)
    .bind(&body.s3_key)
    .bind(&body.original_filename)
    .bind(&body.mime_type)
    .bind(body.file_size_bytes)
    .bind(body.duration_seconds)
    .bind(&body.thumbnail_s3_key)
    .bind(&body.label)
    .bind(sort_order)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(media))
}

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

    // TODO: Generate presigned download URL from s3_key
    Ok(ApiResponse::ok(media))
}

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
        .route("/api/v1/media/presign", post(presign_upload))
        .route("/api/v1/media", post(create_media))
        .route("/api/v1/media/{id}", get(get_media))
        .route(
            "/api/v1/media/{id}/transcription",
            put(update_transcription),
        )
}
