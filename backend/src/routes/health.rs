use axum::{extract::State, http::StatusCode, routing::get, Json, Router};
use serde_json::{json, Value};
use sqlx::PgPool;

async fn health_check(State(pool): State<PgPool>) -> (StatusCode, Json<Value>) {
    let db_ok = sqlx::query("SELECT 1").execute(&pool).await.is_ok();
    let pool_size = pool.size();
    let idle = pool.num_idle();

    let status_code = if db_ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    let body = json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "database": if db_ok { "connected" } else { "disconnected" },
        "pool": {
            "size": pool_size,
            "idle": idle,
        },
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    (status_code, Json(body))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/api/v1/health", get(health_check))
}
