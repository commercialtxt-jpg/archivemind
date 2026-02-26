use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::jwt::create_token;
use crate::auth::middleware::AuthUser;
use crate::auth::password::{hash_password_async, verify_password_async};
use crate::config::Config;
use crate::error::AppError;
use crate::models::user::{AuthResponse, LoginRequest, RegisterRequest, User, UserProfile};

async fn register(
    State(pool): State<PgPool>,
    axum::Extension(config): axum::Extension<Config>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    if body.email.is_empty() || body.password.is_empty() || body.display_name.is_empty() {
        return Err(AppError::BadRequest("All fields are required".to_string()));
    }
    if body.password.len() < 8 {
        return Err(AppError::BadRequest(
            "Password must be at least 8 characters".to_string(),
        ));
    }

    let password_hash = hash_password_async(body.password.clone()).await?;

    let initials: String = body
        .display_name
        .split_whitespace()
        .filter_map(|w| w.chars().next())
        .take(2)
        .collect::<String>()
        .to_uppercase();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, display_name, avatar_initials)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, password_hash, display_name, avatar_initials, created_at, updated_at, \
         plan::text, plan_started_at, plan_expires_at, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_variant_id",
    )
    .bind(&body.email)
    .bind(&password_hash)
    .bind(&body.display_name)
    .bind(&initials)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db_err) if db_err.constraint() == Some("users_email_key") => {
            AppError::Conflict("Email already registered".to_string())
        }
        _ => AppError::from(e),
    })?;

    let workspace_id: Uuid =
        sqlx::query_scalar("INSERT INTO workspaces (user_id, name) VALUES ($1, $2) RETURNING id")
            .bind(user.id)
            .bind("Field Research")
            .fetch_one(&mut *tx)
            .await?;

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Seed demo workspace data. Non-fatal: warn only so registration always succeeds.
    if let Err(e) = crate::seed::seed_demo_workspace(&pool, user.id, workspace_id).await {
        tracing::warn!("Failed to seed demo workspace: {e}");
    }

    let token = create_token(
        user.id,
        workspace_id,
        &config.jwt_secret,
        config.jwt_expiry_hours,
    )?;

    Ok(Json(AuthResponse {
        token,
        user: UserProfile::from(user),
    }))
}

async fn login(
    State(pool): State<PgPool>,
    axum::Extension(config): axum::Extension<Config>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, display_name, avatar_initials, created_at, updated_at, \
         plan::text, plan_started_at, plan_expires_at, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_variant_id \
         FROM users WHERE email = $1"
    )
        .bind(&body.email)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    if !verify_password_async(body.password.clone(), user.password_hash.clone()).await? {
        return Err(AppError::Unauthorized(
            "Invalid email or password".to_string(),
        ));
    }

    let workspace_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM workspaces WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
    )
    .bind(user.id)
    .fetch_one(&pool)
    .await?;

    let token = create_token(
        user.id,
        workspace_id,
        &config.jwt_secret,
        config.jwt_expiry_hours,
    )?;

    Ok(Json(AuthResponse {
        token,
        user: UserProfile::from(user),
    }))
}

async fn me(auth: AuthUser, State(pool): State<PgPool>) -> Result<Json<UserProfile>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, display_name, avatar_initials, created_at, updated_at, \
         plan::text, plan_started_at, plan_expires_at, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_variant_id \
         FROM users WHERE id = $1"
    )
        .bind(auth.user_id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(UserProfile::from(user)))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/auth/register", post(register))
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/me", get(me))
}
