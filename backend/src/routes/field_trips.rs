use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::field_trip::*;
use crate::response::ApiResponse;

async fn list_field_trips(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<FieldTripWithCount>>>, AppError> {
    let trips = sqlx::query_as::<_, FieldTripWithCount>(
        "SELECT ft.id, ft.workspace_id, ft.name, ft.icon, ft.created_at, ft.updated_at, \
         COUNT(nft.note_id) AS note_count \
         FROM field_trips ft \
         LEFT JOIN note_field_trips nft ON nft.field_trip_id = ft.id \
         WHERE ft.workspace_id = $1 \
         GROUP BY ft.id \
         ORDER BY ft.created_at DESC"
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = trips.len() as i64;
    Ok(ApiResponse::list(trips, total, 1, total.max(1)))
}

async fn create_field_trip(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateFieldTrip>,
) -> Result<Json<ApiResponse<FieldTrip>>, AppError> {
    if body.name.is_empty() {
        return Err(AppError::BadRequest("Name is required".to_string()));
    }

    let icon = body.icon.unwrap_or_else(|| "📍".to_string());

    let trip = sqlx::query_as::<_, FieldTrip>(
        "INSERT INTO field_trips (workspace_id, name, icon) \
         VALUES ($1, $2, $3) \
         RETURNING id, workspace_id, name, icon, created_at, updated_at"
    )
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&icon)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(trip))
}

async fn update_field_trip(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateFieldTrip>,
) -> Result<Json<ApiResponse<FieldTrip>>, AppError> {
    let trip = sqlx::query_as::<_, FieldTrip>(
        "UPDATE field_trips SET \
         name = COALESCE($3, name), \
         icon = COALESCE($4, icon), \
         updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING id, workspace_id, name, icon, created_at, updated_at"
    )
    .bind(id)
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.icon)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Field trip not found".to_string()))?;

    Ok(ApiResponse::ok(trip))
}

async fn associate_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<AssociateNote>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    // Verify field trip belongs to workspace
    let _exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM field_trips WHERE id = $1 AND workspace_id = $2)"
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_one(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO note_field_trips (note_id, field_trip_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
    )
    .bind(body.note_id)
    .bind(id)
    .execute(&pool)
    .await?;

    Ok(ApiResponse::ok(serde_json::json!({ "associated": true })))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/field-trips", get(list_field_trips).post(create_field_trip))
        .route("/api/v1/field-trips/{id}", put(update_field_trip))
        .route("/api/v1/field-trips/{id}/notes", post(associate_note))
}
