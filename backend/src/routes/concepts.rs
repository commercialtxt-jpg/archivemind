use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::concept::*;
use crate::response::ApiResponse;

async fn list_concepts(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<ConceptWithCount>>>, AppError> {
    let concepts = sqlx::query_as::<_, ConceptWithCount>(
        "SELECT c.id, c.workspace_id, c.name, c.category, c.icon, c.created_at, c.updated_at, \
         COUNT(nc.note_id) AS note_count \
         FROM concepts c \
         LEFT JOIN note_concepts nc ON nc.concept_id = c.id \
         WHERE c.workspace_id = $1 \
         GROUP BY c.id \
         ORDER BY c.name ASC",
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = concepts.len() as i64;
    Ok(ApiResponse::list(concepts, total, 1, total.max(1)))
}

async fn get_concept(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<ConceptWithCount>>, AppError> {
    let concept = sqlx::query_as::<_, ConceptWithCount>(
        "SELECT c.id, c.workspace_id, c.name, c.category, c.icon, c.created_at, c.updated_at, \
         COUNT(nc.note_id) AS note_count \
         FROM concepts c \
         LEFT JOIN note_concepts nc ON nc.concept_id = c.id \
         WHERE c.id = $1 AND c.workspace_id = $2 \
         GROUP BY c.id",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Concept not found".to_string()))?;

    Ok(ApiResponse::ok(concept))
}

async fn create_concept(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateConcept>,
) -> Result<Json<ApiResponse<Concept>>, AppError> {
    if body.name.is_empty() {
        return Err(AppError::BadRequest("Name is required".to_string()));
    }

    let icon = body.icon.unwrap_or_else(|| "🏷".to_string());

    let concept = sqlx::query_as::<_, Concept>(
        "INSERT INTO concepts (workspace_id, name, category, icon) \
         VALUES ($1, $2, $3, $4) \
         RETURNING id, workspace_id, name, category, icon, created_at, updated_at",
    )
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.category)
    .bind(&icon)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(concept))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/concepts", get(list_concepts).post(create_concept))
        .route("/api/v1/concepts/{id}", get(get_concept))
}
