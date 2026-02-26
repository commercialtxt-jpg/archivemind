use axum::{extract::State, routing::{get, put}, Json, Router};
use chrono::{DateTime, Datelike, Utc};
use sqlx::PgPool;

use crate::auth::middleware::AuthUser;
use crate::auth::password::{hash_password_async, verify_password_async};
use crate::error::AppError;
use crate::models::budget;
use crate::models::plan::*;
use crate::models::user::{User, UserProfile};
use crate::response::ApiResponse;

/// Compute live resource counts from actual tables (not the incremental tracker).
async fn live_counts(pool: &PgPool, workspace_id: uuid::Uuid) -> Result<LiveCounts, AppError> {
    let notes_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notes WHERE workspace_id = $1 AND deleted_at IS NULL",
    )
    .bind(workspace_id)
    .fetch_one(pool)
    .await?;

    let entities_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM entities WHERE workspace_id = $1",
    )
    .bind(workspace_id)
    .fetch_one(pool)
    .await?;

    let media_uploads: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM media m JOIN notes n ON n.id = m.note_id WHERE n.workspace_id = $1",
    )
    .bind(workspace_id)
    .fetch_one(pool)
    .await?;

    let storage_bytes: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(m.file_size_bytes), 0)::BIGINT \
         FROM media m JOIN notes n ON n.id = m.note_id WHERE n.workspace_id = $1",
    )
    .bind(workspace_id)
    .fetch_one(pool)
    .await?;

    Ok(LiveCounts {
        notes_count: notes_count as i32,
        entities_count: entities_count as i32,
        media_uploads: media_uploads as i32,
        storage_bytes,
    })
}

#[derive(Debug)]
struct LiveCounts {
    notes_count: i32,
    entities_count: i32,
    media_uploads: i32,
    storage_bytes: i64,
}

/// Row for fetching grace period info alongside plan.
#[derive(sqlx::FromRow)]
struct PlanGraceRow {
    plan: String,
    plan_started_at: Option<DateTime<Utc>>,
    plan_expires_at: Option<DateTime<Utc>>,
    grace_period_end: Option<DateTime<Utc>>,
    pre_grace_plan: Option<String>,
}

/// GET /api/v1/settings/plan — current plan details, limits, and usage summary
async fn get_plan(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<UsageResponse>>, AppError> {
    let plan_row = sqlx::query_as::<_, PlanGraceRow>(
        "SELECT plan::text, plan_started_at, plan_expires_at, grace_period_end, pre_grace_plan \
         FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_one(&pool)
    .await?;

    let tier = PlanTier::from_str(&plan_row.plan);
    let limits = PlanLimits::for_tier(tier);

    let now = chrono::Utc::now().naive_utc().date();
    let period = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();

    // Get or create tracking record for this period
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
    let live = live_counts(&pool, auth.workspace_id).await?;
    usage.notes_count = usage.notes_count.max(live.notes_count);
    usage.entities_count = usage.entities_count.max(live.entities_count);
    usage.media_uploads = usage.media_uploads.max(live.media_uploads);
    usage.storage_bytes = usage.storage_bytes.max(live.storage_bytes);

    // Platform-wide map budget utilization
    let map_budget_pct = budget::get_budget_utilization(&pool, "map_loads").await.ok();

    Ok(ApiResponse::ok(UsageResponse {
        plan: tier,
        limits,
        usage,
        plan_started_at: plan_row.plan_started_at,
        plan_expires_at: plan_row.plan_expires_at,
        map_budget_pct,
        grace_period_end: plan_row.grace_period_end,
        pre_grace_plan: plan_row.pre_grace_plan,
    }))
}

/// PUT /api/v1/settings/profile — update display_name and/or email
async fn update_profile(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<UpdateProfileRequest>,
) -> Result<Json<ApiResponse<UserProfile>>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET \
         display_name = COALESCE($2, display_name), \
         email = COALESCE($3, email), \
         updated_at = now() \
         WHERE id = $1 \
         RETURNING id, email, password_hash, display_name, avatar_initials, created_at, updated_at, \
         plan::text, plan_started_at, plan_expires_at, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_variant_id",
    )
    .bind(auth.user_id)
    .bind(&body.display_name)
    .bind(&body.email)
    .fetch_one(&pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db_err) if db_err.constraint() == Some("users_email_key") => {
            AppError::Conflict("Email already in use".to_string())
        }
        _ => AppError::from(e),
    })?;

    Ok(ApiResponse::ok(UserProfile::from(user)))
}

/// PUT /api/v1/settings/password — change password
async fn change_password(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<ChangePasswordRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    if body.new_password.len() < 8 {
        return Err(AppError::BadRequest(
            "New password must be at least 8 characters".to_string(),
        ));
    }

    // Fetch current hash
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, display_name, avatar_initials, created_at, updated_at, \
         plan::text, plan_started_at, plan_expires_at, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_variant_id \
         FROM users WHERE id = $1"
    )
        .bind(auth.user_id)
        .fetch_one(&pool)
        .await?;

    // Verify current password (offloaded to blocking thread — Argon2 is CPU-intensive)
    if !verify_password_async(body.current_password.clone(), user.password_hash.clone()).await? {
        return Err(AppError::Unauthorized(
            "Current password is incorrect".to_string(),
        ));
    }

    // Hash and update (offloaded to blocking thread)
    let new_hash = hash_password_async(body.new_password.clone()).await?;
    sqlx::query("UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1")
        .bind(auth.user_id)
        .bind(&new_hash)
        .execute(&pool)
        .await?;

    Ok(ApiResponse::ok(
        serde_json::json!({ "message": "Password updated" }),
    ))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/settings/plan", get(get_plan))
        .route("/api/v1/settings/profile", put(update_profile))
        .route("/api/v1/settings/password", put(change_password))
}
