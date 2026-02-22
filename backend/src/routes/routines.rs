use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::routine::*;
use crate::response::ApiResponse;

async fn list_routines(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<Routine>>>, AppError> {
    let routines = sqlx::query_as::<_, Routine>(
        "SELECT id, workspace_id, name, checklist, is_active, created_at, updated_at \
         FROM routines WHERE workspace_id = $1 ORDER BY created_at DESC"
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = routines.len() as i64;
    Ok(ApiResponse::list(routines, total, 1, total.max(1)))
}

async fn create_routine(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateRoutine>,
) -> Result<Json<ApiResponse<Routine>>, AppError> {
    if body.name.is_empty() {
        return Err(AppError::BadRequest("Name is required".to_string()));
    }
    let checklist = body.checklist.unwrap_or_else(|| serde_json::json!([]));

    let routine = sqlx::query_as::<_, Routine>(
        "INSERT INTO routines (workspace_id, name, checklist) VALUES ($1, $2, $3) \
         RETURNING id, workspace_id, name, checklist, is_active, created_at, updated_at"
    )
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&checklist)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(routine))
}

async fn update_routine(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateRoutine>,
) -> Result<Json<ApiResponse<Routine>>, AppError> {
    let routine = sqlx::query_as::<_, Routine>(
        "UPDATE routines SET \
         name = COALESCE($3, name), \
         checklist = COALESCE($4, checklist), \
         is_active = COALESCE($5, is_active), \
         updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING id, workspace_id, name, checklist, is_active, created_at, updated_at"
    )
    .bind(id)
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.checklist)
    .bind(body.is_active)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Routine not found".to_string()))?;

    Ok(ApiResponse::ok(routine))
}

async fn start_routine(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Routine>>, AppError> {
    // Deactivate all other routines first
    sqlx::query("UPDATE routines SET is_active = false, updated_at = now() WHERE workspace_id = $1")
        .bind(auth.workspace_id)
        .execute(&pool)
        .await?;

    let routine = sqlx::query_as::<_, Routine>(
        "UPDATE routines SET is_active = true, updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING id, workspace_id, name, checklist, is_active, created_at, updated_at"
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Routine not found".to_string()))?;

    Ok(ApiResponse::ok(routine))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/routines", get(list_routines).post(create_routine))
        .route("/api/v1/routines/{id}", get(update_routine))
        .route("/api/v1/routines/{id}/start", post(start_routine))
}
