use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::entity::*;
use crate::models::note::NoteSummary;
use crate::response::ApiResponse;

async fn list_entities(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Query(filters): Query<EntityFilters>,
) -> Result<Json<ApiResponse<Vec<Entity>>>, AppError> {
    let page = filters.page.unwrap_or(1).max(1);
    let per_page = filters.per_page.unwrap_or(50).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let (entities, total) = if let Some(ref entity_type) = filters.entity_type {
        let entities = sqlx::query_as::<_, Entity>(
            "SELECT id, workspace_id, name, entity_type::text, role, avatar_initials, created_at, updated_at \
             FROM entities WHERE workspace_id = $1 AND entity_type::text = $2 \
             ORDER BY name ASC LIMIT $3 OFFSET $4"
        )
        .bind(auth.workspace_id)
        .bind(entity_type)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM entities WHERE workspace_id = $1 AND entity_type::text = $2",
        )
        .bind(auth.workspace_id)
        .bind(entity_type)
        .fetch_one(&pool)
        .await?;

        (entities, total)
    } else {
        let entities = sqlx::query_as::<_, Entity>(
            "SELECT id, workspace_id, name, entity_type::text, role, avatar_initials, created_at, updated_at \
             FROM entities WHERE workspace_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3"
        )
        .bind(auth.workspace_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM entities WHERE workspace_id = $1")
                .bind(auth.workspace_id)
                .fetch_one(&pool)
                .await?;

        (entities, total)
    };

    Ok(ApiResponse::list(entities, total, page, per_page))
}

async fn get_entity(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<EntityWithStats>>, AppError> {
    let entity = sqlx::query_as::<_, EntityWithStats>(
        "SELECT e.id, e.workspace_id, e.name, e.entity_type::text, e.role, e.avatar_initials, \
         e.created_at, e.updated_at, \
         COALESCE(SUM(ne.mention_count), 0) AS total_mentions, \
         COUNT(DISTINCT ne.note_id) AS session_count, \
         COUNT(DISTINCT nc.concept_id) AS concept_count \
         FROM entities e \
         LEFT JOIN note_entities ne ON ne.entity_id = e.id \
         LEFT JOIN note_concepts nc ON nc.note_id = ne.note_id \
         WHERE e.id = $1 AND e.workspace_id = $2 \
         GROUP BY e.id",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Entity not found".to_string()))?;

    Ok(ApiResponse::ok(entity))
}

async fn create_entity(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateEntity>,
) -> Result<Json<ApiResponse<Entity>>, AppError> {
    if body.name.is_empty() {
        return Err(AppError::BadRequest("Name is required".to_string()));
    }

    let initials = body.avatar_initials.clone().unwrap_or_else(|| {
        body.name
            .split_whitespace()
            .filter_map(|w| w.chars().next())
            .take(2)
            .collect::<String>()
            .to_uppercase()
    });

    let entity = sqlx::query_as::<_, Entity>(
        "INSERT INTO entities (workspace_id, name, entity_type, role, avatar_initials) \
         VALUES ($1, $2, $3::entity_type, $4, $5) \
         RETURNING id, workspace_id, name, entity_type::text, role, avatar_initials, created_at, updated_at"
    )
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.entity_type)
    .bind(&body.role)
    .bind(&initials)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(entity))
}

async fn update_entity(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateEntity>,
) -> Result<Json<ApiResponse<Entity>>, AppError> {
    let entity = sqlx::query_as::<_, Entity>(
        "UPDATE entities SET \
         name = COALESCE($3, name), \
         role = COALESCE($4, role), \
         avatar_initials = COALESCE($5, avatar_initials), \
         updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING id, workspace_id, name, entity_type::text, role, avatar_initials, created_at, updated_at"
    )
    .bind(id)
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.role)
    .bind(&body.avatar_initials)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Entity not found".to_string()))?;

    Ok(ApiResponse::ok(entity))
}

async fn entity_notes(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<NoteSummary>>>, AppError> {
    let notes = sqlx::query_as::<_, NoteSummary>(
        "SELECT n.id, n.workspace_id, n.title, n.body_text, n.note_type::text AS note_type, n.is_starred, \
         n.location_name, n.gps_coords, n.weather, \
         COALESCE(ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::TEXT[]) AS tags, \
         n.created_at, n.updated_at \
         FROM notes n \
         JOIN note_entities ne ON ne.note_id = n.id \
         LEFT JOIN note_tags nt ON nt.note_id = n.id \
         LEFT JOIN tags t ON t.id = nt.tag_id \
         WHERE ne.entity_id = $1 AND n.workspace_id = $2 AND n.deleted_at IS NULL \
         GROUP BY n.id \
         ORDER BY n.created_at DESC",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = notes.len() as i64;
    Ok(ApiResponse::list(notes, total, 1, total.max(1)))
}

async fn entity_topics(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<EntityTopic>>>, AppError> {
    let topics = sqlx::query_as::<_, EntityTopic>(
        "SELECT c.id, c.name, COUNT(DISTINCT nc.note_id) AS note_count \
         FROM concepts c \
         JOIN note_concepts nc ON nc.concept_id = c.id \
         JOIN note_entities ne ON ne.note_id = nc.note_id \
         WHERE ne.entity_id = $1 AND c.workspace_id = $2 \
         GROUP BY c.id \
         ORDER BY note_count DESC",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    Ok(ApiResponse::ok(topics))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/entities", get(list_entities).post(create_entity))
        .route("/api/v1/entities/{id}", get(get_entity).put(update_entity))
        .route("/api/v1/entities/{id}/notes", get(entity_notes))
        .route("/api/v1/entities/{id}/topics", get(entity_topics))
}
