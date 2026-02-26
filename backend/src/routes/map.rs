use axum::{extract::State, routing::get, Json, Router};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::middleware::plan_guard;
use crate::models::map::MapLocation;
use crate::response::ApiResponse;

// ---------------------------------------------------------------------------
// GPS coordinate parser
// ---------------------------------------------------------------------------

/// Parse a GPS string like "7.2906°N, 80.6337°E" into (lat, lng).
/// Also accepts plain decimal "7.2906, 80.6337".
/// Returns None if the string cannot be parsed.
fn parse_gps(s: &str) -> Option<(f64, f64)> {
    let s = s.trim();

    // Try degree-notation: "7.2906°N, 80.6337°E"
    // Pattern: <number>°<N|S>, <number>°<E|W>
    if s.contains('°') {
        let parts: Vec<&str> = s.split(',').collect();
        if parts.len() >= 2 {
            let lat = parse_degree_part(parts[0].trim())?;
            let lng = parse_degree_part(parts[1].trim())?;
            return Some((lat, lng));
        }
    }

    // Try plain decimal: "7.2906 80.6337" or "7.2906, 80.6337"
    let parts: Vec<&str> = s.split(|c: char| c == ',' || c.is_whitespace())
        .filter(|p| !p.is_empty())
        .collect();
    if parts.len() >= 2 {
        let lat = parts[0].parse::<f64>().ok()?;
        let lng = parts[1].parse::<f64>().ok()?;
        return Some((lat, lng));
    }

    None
}

/// Parse one half of a degree coordinate string, e.g. "7.2906°N" or "80.6337°E".
fn parse_degree_part(s: &str) -> Option<f64> {
    // Remove degree symbol and split from direction letter
    let clean: String = s.chars().filter(|&c| c != '°').collect();
    let clean = clean.trim();

    // Last char might be N/S/E/W
    let (num_str, direction) = if let Some(last) = clean.chars().last() {
        if matches!(last, 'N' | 'S' | 'E' | 'W' | 'n' | 's' | 'e' | 'w') {
            let n = &clean[..clean.len() - 1].trim();
            (n.to_string(), Some(last.to_ascii_uppercase()))
        } else {
            (clean.to_string(), None)
        }
    } else {
        return None;
    };

    let value = num_str.trim().parse::<f64>().ok()?;
    match direction {
        Some('S') | Some('W') => Some(-value),
        _ => Some(value),
    }
}

// ---------------------------------------------------------------------------
// Row types for sqlx queries
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct NoteRow {
    id: Uuid,
    title: String,
    note_type: String,
    location_name: Option<String>,
    location_lat: Option<f64>,
    location_lng: Option<f64>,
    gps_coords: Option<String>,
}

#[derive(sqlx::FromRow)]
struct EntityRow {
    id: Uuid,
    name: String,
    note_count: Option<i64>,
}

// Hardcoded approximate lat/lng for Sri Lanka locations by name.
// These are used when an entity doesn't have an explicit GPS but we know
// the city from our seed data.
fn approx_coords_for_location(name: &str) -> Option<(f64, f64)> {
    let name_lower = name.to_lowercase();
    if name_lower.contains("kandy") {
        Some((7.2906, 80.6337))
    } else if name_lower.contains("galle") {
        Some((6.0535, 80.2210))
    } else if name_lower.contains("ella") {
        Some((6.8667, 81.0500))
    } else if name_lower.contains("peradeniya") {
        Some((7.2722, 80.5953))
    } else if name_lower.contains("colombo") {
        Some((6.9271, 79.8612))
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async fn map_locations(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<MapLocation>>>, AppError> {
    // Increment map loads counter (best-effort, don't block on limit)
    let _ = plan_guard::increment_usage(&pool, auth.user_id, auth.workspace_id, "map_loads", 1).await;

    let mut locations: Vec<MapLocation> = Vec::new();

    // ── 1. Notes with GPS data ──────────────────────────────────────────────
    let note_rows = sqlx::query_as::<_, NoteRow>(
        "SELECT id, title, note_type::text, location_name, location_lat, location_lng, gps_coords \
         FROM notes \
         WHERE workspace_id = $1 \
           AND deleted_at IS NULL \
           AND (gps_coords IS NOT NULL OR (location_lat IS NOT NULL AND location_lng IS NOT NULL))",
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    for row in note_rows {
        // Prefer explicit lat/lng columns; fall back to parsing gps_coords string
        let coords = if let (Some(lat), Some(lng)) = (row.location_lat, row.location_lng) {
            Some((lat, lng))
        } else if let Some(ref gps) = row.gps_coords {
            parse_gps(gps)
        } else {
            None
        };

        if let Some((lat, lng)) = coords {
            locations.push(MapLocation {
                id: Uuid::new_v4(),
                name: row
                    .location_name
                    .clone()
                    .unwrap_or_else(|| row.title.clone()),
                source_type: "note".to_string(),
                source_id: row.id,
                lat,
                lng,
                note_type: Some(row.note_type),
                note_count: 1,
                location_name: row.location_name,
            });
        }
    }

    // ── 2. Location entities with note counts ───────────────────────────────
    let entity_rows = sqlx::query_as::<_, EntityRow>(
        "SELECT e.id, e.name, COUNT(ne.note_id) AS note_count \
         FROM entities e \
         LEFT JOIN note_entities ne ON ne.entity_id = e.id \
         WHERE e.workspace_id = $1 AND e.entity_type::text = 'location' \
         GROUP BY e.id, e.name \
         ORDER BY e.name",
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    for row in entity_rows {
        if let Some((lat, lng)) = approx_coords_for_location(&row.name) {
            locations.push(MapLocation {
                id: Uuid::new_v4(),
                name: row.name.clone(),
                source_type: "entity".to_string(),
                source_id: row.id,
                lat,
                lng,
                note_type: None,
                note_count: row.note_count.unwrap_or(0),
                location_name: Some(row.name),
            });
        }
    }

    let total = locations.len() as i64;
    Ok(ApiResponse::list(locations, total, 1, total.max(1)))
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<PgPool> {
    Router::new().route("/api/v1/map/locations", get(map_locations))
}
