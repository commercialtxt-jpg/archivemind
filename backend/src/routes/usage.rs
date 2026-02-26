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

    let mut usage = sqlx::query_as::<_, UsageRecord>(
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

    // Override with live counts so pre-existing data is reflected
    let notes_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notes WHERE workspace_id = $1 AND deleted_at IS NULL",
    )
    .bind(auth.workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let entities_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM entities WHERE workspace_id = $1",
    )
    .bind(auth.workspace_id)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let media_uploads: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM media")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let storage_bytes: i64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT FROM media")
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

    usage.notes_count = usage.notes_count.max(notes_count as i32);
    usage.entities_count = usage.entities_count.max(entities_count as i32);
    usage.media_uploads = usage.media_uploads.max(media_uploads as i32);
    usage.storage_bytes = usage.storage_bytes.max(storage_bytes);

    Ok(ApiResponse::ok(UsageResponse {
        plan: tier,
        limits,
        usage,
        plan_started_at: plan_row.plan_started_at,
        plan_expires_at: plan_row.plan_expires_at,
        map_budget_pct: None,
        grace_period_end: None,
        pre_grace_plan: None,
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
