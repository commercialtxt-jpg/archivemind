use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct FieldTrip {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub icon: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct FieldTripWithCount {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub icon: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub note_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFieldTrip {
    pub name: String,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFieldTrip {
    pub name: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssociateNote {
    pub note_id: Uuid,
}
