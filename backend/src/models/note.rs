use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Note {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub title: String,
    pub body: serde_json::Value,
    pub body_text: String,
    pub note_type: String,
    pub is_starred: bool,
    pub location_name: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub gps_coords: Option<String>,
    pub weather: Option<String>,
    pub temperature_c: Option<f32>,
    pub time_start: Option<DateTime<Utc>>,
    pub time_end: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct NoteSummary {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub title: String,
    pub body_text: String,
    pub note_type: String,
    pub is_starred: bool,
    pub location_name: Option<String>,
    pub gps_coords: Option<String>,
    pub weather: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNote {
    pub title: String,
    #[serde(default = "default_body")]
    pub body: serde_json::Value,
    #[serde(default)]
    pub body_text: String,
    #[serde(default = "default_note_type")]
    pub note_type: String,
    pub location_name: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub gps_coords: Option<String>,
    pub weather: Option<String>,
    pub temperature_c: Option<f32>,
    pub time_start: Option<DateTime<Utc>>,
    pub time_end: Option<DateTime<Utc>>,
    pub field_trip_ids: Option<Vec<Uuid>>,
    pub tag_names: Option<Vec<String>>,
    pub concept_ids: Option<Vec<Uuid>>,
    pub entity_ids: Option<Vec<Uuid>>,
}

fn default_body() -> serde_json::Value {
    serde_json::json!({})
}

fn default_note_type() -> String {
    "field_note".to_string()
}

#[derive(Debug, Deserialize)]
pub struct UpdateNote {
    pub title: Option<String>,
    pub body: Option<serde_json::Value>,
    pub body_text: Option<String>,
    pub note_type: Option<String>,
    pub location_name: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub gps_coords: Option<String>,
    pub weather: Option<String>,
    pub temperature_c: Option<f32>,
    pub time_start: Option<DateTime<Utc>>,
    pub time_end: Option<DateTime<Utc>>,
    pub field_trip_ids: Option<Vec<Uuid>>,
    pub tag_names: Option<Vec<String>>,
    pub concept_ids: Option<Vec<Uuid>>,
    pub entity_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
pub struct NoteFilters {
    pub note_type: Option<String>,
    pub field_trip_id: Option<Uuid>,
    pub concept_id: Option<Uuid>,
    pub entity_id: Option<Uuid>,
    /// Filter notes that mention any entity of the given type (person/location/artifact)
    pub entity_type: Option<String>,
    pub starred: Option<bool>,
    pub deleted: Option<bool>,
    pub sort: Option<String>,
    pub order: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub count_only: Option<bool>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ConnectedNote {
    pub id: Uuid,
    pub title: String,
    pub note_type: String,
    pub strength: f32,
    pub label: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct NoteCount {
    pub total: i64,
    pub starred: i64,
    pub deleted: i64,
}
