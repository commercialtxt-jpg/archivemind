use axum::{extract::State, routing::get, Json, Router};
use chrono::{Datelike, Utc};
use sqlx::PgPool;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::plan::*;
use crate::response::ApiResponse;

/// GET /api/v1/usage — current month's usage + plan limits
async fn get_usage(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<UsageResponse>>, AppError> {
    // Get user plan
    let plan_row = sqlx::query_as::<_, UserPlanRow>(
        "SELECT plan::text, plan_started_at, plan_expires_at FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_one(&pool)
    .await?;

    let tier = PlanTier::from_str(&plan_row.plan);
    let limits = PlanLimits::for_tier(tier);

    // Get or create current period usage
    let now = Utc::now().naive_utc().date();
    let period = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();

    let usage = sqlx::query_as::<_, UsageRecord>(
        "INSERT INTO usage_tracking (user_id, workspace_id, period_start) \
         VALUES ($1, $2, $3) \
         ON CONFLICT (user_id, period_start) DO UPDATE SET updated_at = now() \
         RETURNING *",
    )
    .bind(auth.user_id)
    .bind(auth.workspace_id)
    .bind(period)
    .fetch_one(&pool)
    .await?;

    Ok(ApiResponse::ok(UsageResponse {
        plan: tier,
        limits,
        usage,
        plan_started_at: plan_row.plan_started_at,
        plan_expires_at: plan_row.plan_expires_at,
    }))
}

/// GET /api/v1/usage/history — last 6 months of usage
async fn get_usage_history(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<UsageRecord>>>, AppError> {
    let records = sqlx::query_as::<_, UsageRecord>(
        "SELECT * FROM usage_tracking \
         WHERE user_id = $1 \
         ORDER BY period_start DESC \
         LIMIT 6",
    )
    .bind(auth.user_id)
    .fetch_all(&pool)
    .await?;

    let total = records.len() as i64;
    Ok(ApiResponse::list(records, total, 1, 6))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/usage", get(get_usage))
        .route("/api/v1/usage/history", get(get_usage_history))
}
