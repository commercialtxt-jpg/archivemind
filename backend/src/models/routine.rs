use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Routine {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub checklist: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoutine {
    pub name: String,
    pub checklist: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoutine {
    pub name: Option<String>,
    pub checklist: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}
