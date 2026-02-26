use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Concept {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub icon: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ConceptWithCount {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub icon: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub note_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateConcept {
    pub name: String,
    pub category: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateConcept {
    pub name: Option<String>,
    pub category: Option<String>,
    pub icon: Option<String>,
}
