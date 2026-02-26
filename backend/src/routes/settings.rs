use axum::{extract::State, routing::{get, put}, Json, Router};
use chrono::Datelike;
use sqlx::PgPool;

use crate::auth::middleware::AuthUser;
use crate::auth::password::{hash_password, verify_password};
use crate::error::AppError;
use crate::models::plan::*;
use crate::models::user::{User, UserProfile};
use crate::response::ApiResponse;

/// GET /api/v1/settings/plan — current plan details, limits, and usage summary
async fn get_plan(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<UsageResponse>>, AppError> {
    let plan_row = sqlx::query_as::<_, UserPlanRow>(
        "SELECT plan::text, plan_started_at, plan_expires_at FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_one(&pool)
    .await?;

    let tier = PlanTier::from_str(&plan_row.plan);
    let limits = PlanLimits::for_tier(tier);

    let now = chrono::Utc::now().naive_utc().date();
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

    // Verify current password
    if !verify_password(&body.current_password, &user.password_hash)? {
        return Err(AppError::Unauthorized(
            "Current password is incorrect".to_string(),
        ));
    }

    // Hash and update
    let new_hash = hash_password(&body.new_password)?;
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
