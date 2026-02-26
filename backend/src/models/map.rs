use serde::Serialize;
use uuid::Uuid;

/// A location point returned by the /api/v1/map/locations endpoint.
/// Can come from either a note (with GPS coords) or a location entity.
#[derive(Debug, Serialize)]
pub struct MapLocation {
    pub id: Uuid,
    pub name: String,
    /// "note" or "entity"
    pub source_type: String,
    pub source_id: Uuid,
    pub lat: f64,
    pub lng: f64,
    /// Set for note sources; null for entity sources
    pub note_type: Option<String>,
    /// Number of notes associated with this location
    pub note_count: i64,
    pub location_name: Option<String>,
}
