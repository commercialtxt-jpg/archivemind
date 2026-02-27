use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Media {
    pub id: Uuid,
    pub note_id: Uuid,
    pub media_type: String,
    pub s3_key: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub duration_seconds: Option<f32>,
    pub thumbnail_s3_key: Option<String>,
    pub label: Option<String>,
    pub transcription_status: String,
    pub transcription_text: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateMedia {
    pub note_id: Uuid,
    pub media_type: String,
    pub s3_key: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub duration_seconds: Option<f32>,
    pub thumbnail_s3_key: Option<String>,
    pub label: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct PresignRequest {
    pub filename: String,
    pub content_type: String,
    pub note_id: Uuid,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct PresignResponse {
    pub upload_url: String,
    pub s3_key: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTranscription {
    pub status: String,
    pub text: Option<String>,
}
