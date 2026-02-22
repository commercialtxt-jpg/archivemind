use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Entity {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub entity_type: String,
    pub role: Option<String>,
    pub avatar_initials: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EntityWithStats {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub entity_type: String,
    pub role: Option<String>,
    pub avatar_initials: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub total_mentions: Option<i64>,
    pub session_count: Option<i64>,
    pub concept_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEntity {
    pub name: String,
    pub entity_type: String,
    pub role: Option<String>,
    pub avatar_initials: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntity {
    pub name: Option<String>,
    pub role: Option<String>,
    pub avatar_initials: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EntityFilters {
    #[serde(rename = "type")]
    pub entity_type: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EntityTopic {
    pub id: Uuid,
    pub name: String,
    pub note_count: Option<i64>,
}
