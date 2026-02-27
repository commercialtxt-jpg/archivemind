use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[allow(dead_code)]
pub struct Tag {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TagWithCount {
    pub id: Uuid,
    pub name: String,
    pub note_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateTag {
    pub name: String,
}
