use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::routine::*;
use crate::response::ApiResponse;

const SELECT_COLS: &str =
    "id, workspace_id, field_trip_id, name, icon, checklist, is_active, created_at, updated_at";

async fn list_routines(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<Routine>>>, AppError> {
    let routines = sqlx::query_as::<_, Routine>(
        &format!("SELECT {SELECT_COLS} FROM routines WHERE workspace_id = $1 ORDER BY is_active DESC, created_at DESC"),
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
    let icon = body.icon.unwrap_or_else(|| "📋".to_string());

    let routine = sqlx::query_as::<_, Routine>(
        &format!("INSERT INTO routines (workspace_id, field_trip_id, name, icon, checklist) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING {SELECT_COLS}"),
    )
    .bind(auth.workspace_id)
    .bind(body.field_trip_id)
    .bind(&body.name)
    .bind(&icon)
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
        &format!("UPDATE routines SET \
         name = COALESCE($3, name), \
         icon = COALESCE($4, icon), \
         field_trip_id = COALESCE($5, field_trip_id), \
         checklist = COALESCE($6, checklist), \
         is_active = COALESCE($7, is_active), \
         updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING {SELECT_COLS}"),
    )
    .bind(id)
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.icon)
    .bind(body.field_trip_id)
    .bind(&body.checklist)
    .bind(body.is_active)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Routine not found".to_string()))?;

    Ok(ApiResponse::ok(routine))
}

async fn delete_routine(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = sqlx::query("DELETE FROM routines WHERE id = $1 AND workspace_id = $2")
        .bind(id)
        .bind(auth.workspace_id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Routine not found".to_string()));
    }
    Ok(ApiResponse::ok(serde_json::json!({ "deleted": true })))
}

async fn start_routine(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Routine>>, AppError> {
    // Deactivate all other routines first
    sqlx::query(
        "UPDATE routines SET is_active = false, updated_at = now() WHERE workspace_id = $1",
    )
    .bind(auth.workspace_id)
    .execute(&pool)
    .await?;

    let routine = sqlx::query_as::<_, Routine>(
        &format!("UPDATE routines SET is_active = true, updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING {SELECT_COLS}"),
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Routine not found".to_string()))?;

    Ok(ApiResponse::ok(routine))
}

async fn stop_routine(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Routine>>, AppError> {
    let routine = sqlx::query_as::<_, Routine>(
        &format!("UPDATE routines SET is_active = false, updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING {SELECT_COLS}"),
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
        .route(
            "/api/v1/routines/{id}",
            put(update_routine).delete(delete_routine),
        )
        .route("/api/v1/routines/{id}/start", post(start_routine))
        .route("/api/v1/routines/{id}/stop", post(stop_routine))
}
