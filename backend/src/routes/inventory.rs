use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::inventory::*;
use crate::response::ApiResponse;

async fn list_inventory(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<InventoryItem>>>, AppError> {
    let items = sqlx::query_as::<_, InventoryItem>(
        "SELECT id, workspace_id, name, icon, status::text, sort_order, created_at, updated_at \
         FROM inventory_items WHERE workspace_id = $1 ORDER BY sort_order ASC, name ASC",
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = items.len() as i64;
    Ok(ApiResponse::list(items, total, 1, total.max(1)))
}

async fn create_inventory_item(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateInventoryItem>,
) -> Result<Json<ApiResponse<InventoryItem>>, AppError> {
    if body.name.is_empty() {
        return Err(AppError::BadRequest("Name is required".to_string()));
    }
    let icon = body.icon.unwrap_or_else(|| "📦".to_string());
    let status = body.status.unwrap_or_else(|| "packed".to_string());
    let sort_order = body.sort_order.unwrap_or(0);

    let item = sqlx::query_as::<_, InventoryItem>(
        "INSERT INTO inventory_items (workspace_id, name, icon, status, sort_order) \
         VALUES ($1, $2, $3, $4::inventory_status, $5) \
         RETURNING id, workspace_id, name, icon, status::text, sort_order, created_at, updated_at",
    )
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&icon)
    .bind(&status)
    .bind(sort_order)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(item))
}

async fn update_inventory_item(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateInventoryItem>,
) -> Result<Json<ApiResponse<InventoryItem>>, AppError> {
    let item = sqlx::query_as::<_, InventoryItem>(
        "UPDATE inventory_items SET \
         name = COALESCE($3, name), \
         icon = COALESCE($4, icon), \
         status = COALESCE($5::inventory_status, status), \
         sort_order = COALESCE($6, sort_order), \
         updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 \
         RETURNING id, workspace_id, name, icon, status::text, sort_order, created_at, updated_at",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .bind(&body.name)
    .bind(&body.icon)
    .bind(&body.status)
    .bind(body.sort_order)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Inventory item not found".to_string()))?;

    Ok(ApiResponse::ok(item))
}

async fn delete_inventory_item(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = sqlx::query("DELETE FROM inventory_items WHERE id = $1 AND workspace_id = $2")
        .bind(id)
        .bind(auth.workspace_id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Inventory item not found".to_string()));
    }
    Ok(ApiResponse::ok(serde_json::json!({ "deleted": true })))
}

async fn inventory_alerts(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<InventoryAlert>>, AppError> {
    let items = sqlx::query_as::<_, InventoryItem>(
        "SELECT id, workspace_id, name, icon, status::text, sort_order, created_at, updated_at \
         FROM inventory_items WHERE workspace_id = $1 AND status::text IN ('low', 'missing') \
         ORDER BY sort_order ASC",
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let count = items.len() as i64;
    Ok(ApiResponse::ok(InventoryAlert { items, count }))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route(
            "/api/v1/inventory",
            get(list_inventory).post(create_inventory_item),
        )
        .route(
            "/api/v1/inventory/{id}",
            get(update_inventory_item).delete(delete_inventory_item),
        )
        .route("/api/v1/inventory/alerts", get(inventory_alerts))
}
