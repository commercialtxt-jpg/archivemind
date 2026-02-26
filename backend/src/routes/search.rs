use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct SearchResults {
    pub notes: Vec<NoteSearchResult>,
    pub entities: Vec<EntitySearchResult>,
    pub concepts: Vec<ConceptSearchResult>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct NoteSearchResult {
    pub id: Uuid,
    pub title: String,
    pub note_type: String,
    pub excerpt: String,
    pub rank: f32,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EntitySearchResult {
    pub id: Uuid,
    pub name: String,
    pub entity_type: String,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ConceptSearchResult {
    pub id: Uuid,
    pub name: String,
    pub category: Option<String>,
}

/// Escape special ILIKE wildcard characters so user input is treated as a
/// literal substring, not a pattern. Escapes `\`, `%`, and `_`.
fn escape_like(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

async fn search(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Query(params): Query<SearchParams>,
) -> Result<Json<ApiResponse<SearchResults>>, AppError> {
    if params.q.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Search query cannot be empty".to_string(),
        ));
    }

    let like_pattern = format!("%{}%", escape_like(&params.q));

    // Run all three queries concurrently for better performance
    let (notes, entities, concepts) = tokio::try_join!(
        sqlx::query_as::<_, NoteSearchResult>(
            "SELECT id, title, note_type::text, \
             left(body_text, 200) AS excerpt, \
             ts_rank(\
                 to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, '')), \
                 plainto_tsquery('english', $2)\
             ) AS rank \
             FROM notes \
             WHERE workspace_id = $1 AND deleted_at IS NULL \
               AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, '')) \
                   @@ plainto_tsquery('english', $2) \
             ORDER BY rank DESC \
             LIMIT 20",
        )
        .bind(auth.workspace_id)
        .bind(&params.q)
        .fetch_all(&pool),
        sqlx::query_as::<_, EntitySearchResult>(
            "SELECT id, name, entity_type::text, role \
             FROM entities \
             WHERE workspace_id = $1 AND name ILIKE $2 ESCAPE '\\' \
             ORDER BY name ASC LIMIT 10",
        )
        .bind(auth.workspace_id)
        .bind(&like_pattern)
        .fetch_all(&pool),
        sqlx::query_as::<_, ConceptSearchResult>(
            "SELECT id, name, category \
             FROM concepts \
             WHERE workspace_id = $1 AND name ILIKE $2 ESCAPE '\\' \
             ORDER BY name ASC LIMIT 10",
        )
        .bind(auth.workspace_id)
        .bind(&like_pattern)
        .fetch_all(&pool),
    )?;

    Ok(ApiResponse::ok(SearchResults {
        notes,
        entities,
        concepts,
    }))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/api/v1/search", get(search))
}
