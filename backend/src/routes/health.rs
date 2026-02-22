use axum::{extract::State, routing::get, Json, Router};
use serde_json::{json, Value};
use sqlx::PgPool;

use crate::error::AppError;

async fn health_check(State(pool): State<PgPool>) -> Result<Json<Value>, AppError> {
    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .map_err(|e| AppError::Internal(format!("Database health check failed: {}", e)))?;

    Ok(Json(json!({ "status": "ok" })))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/api/v1/health", get(health_check))
}
