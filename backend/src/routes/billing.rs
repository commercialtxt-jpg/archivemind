use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Extension, Json, Router,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::PgPool;

use crate::auth::middleware::AuthUser;
use crate::config::Config;
use crate::error::AppError;
use crate::response::ApiResponse;

type HmacSha256 = Hmac<Sha256>;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize)]
struct CheckoutRequest {
    tier: String,
}

#[derive(serde::Serialize)]
struct CheckoutResponse {
    checkout_url: String,
}

#[derive(serde::Serialize)]
struct PortalResponse {
    portal_url: String,
}

// ---------------------------------------------------------------------------
// Webhook types (simplified LemonSqueezy payload)
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize)]
struct WebhookPayload {
    meta: WebhookMeta,
    data: WebhookData,
}

#[derive(serde::Deserialize)]
struct WebhookMeta {
    event_name: String,
    custom_data: Option<WebhookCustomData>,
}

#[derive(serde::Deserialize)]
struct WebhookCustomData {
    user_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct WebhookData {
    id: String,
    attributes: WebhookAttributes,
}

#[derive(serde::Deserialize)]
struct WebhookAttributes {
    customer_id: Option<i64>,
    variant_id: Option<i64>,
    #[allow(dead_code)]
    status: Option<String>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Map a LemonSqueezy variant ID to a plan tier string.
/// In production these would come from env vars; hardcoded for now.
fn variant_to_tier(variant_id: i64) -> &'static str {
    match variant_id {
        // Replace with real LemonSqueezy variant IDs
        1 => "pro",
        2 => "team",
        _ => "free",
    }
}

/// Map a tier string to a LemonSqueezy variant ID.
fn tier_to_variant(tier: &str) -> Option<i64> {
    match tier {
        "pro" => Some(1),
        "team" => Some(2),
        _ => None,
    }
}

/// Verify the HMAC-SHA256 signature from LemonSqueezy's `X-Signature` header.
fn verify_signature(secret: &str, body: &[u8], signature: &str) -> bool {
    if secret.is_empty() {
        // No secret configured — fail closed to prevent accepting unauthenticated webhooks
        tracing::warn!("LEMONSQUEEZY_WEBHOOK_SECRET is not set; rejecting all webhook requests");
        return false;
    }
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else {
        return false;
    };
    mac.update(body);
    let expected = hex::encode(mac.finalize().into_bytes());
    expected == signature
}

// ---------------------------------------------------------------------------
// POST /api/v1/billing/webhook — LemonSqueezy webhook (unauthenticated)
// ---------------------------------------------------------------------------

async fn webhook(
    State(pool): State<PgPool>,
    Extension(config): Extension<Config>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    // Verify signature
    let signature = headers
        .get("x-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !verify_signature(&config.lemonsqueezy_webhook_secret, &body, signature) {
        return Err(AppError::Unauthorized(
            "Invalid webhook signature".to_string(),
        ));
    }

    let payload: WebhookPayload = serde_json::from_slice(&body)
        .map_err(|e| AppError::BadRequest(format!("Invalid webhook payload: {e}")))?;

    let event = &payload.meta.event_name;
    let user_id_str = payload
        .meta
        .custom_data
        .as_ref()
        .and_then(|d| d.user_id.as_deref());

    let subscription_id = &payload.data.id;
    let customer_id = payload.data.attributes.customer_id;
    let variant_id = payload.data.attributes.variant_id;

    match event.as_str() {
        "subscription_created" => {
            let Some(uid) = user_id_str else {
                return Err(AppError::BadRequest("Missing user_id in custom_data".to_string()));
            };
            let user_id: uuid::Uuid = uid
                .parse()
                .map_err(|_| AppError::BadRequest("Invalid user_id".to_string()))?;
            let tier = variant_id.map(variant_to_tier).unwrap_or("pro");

            sqlx::query(
                "UPDATE users SET plan = $2, plan_started_at = now(), \
                 lemonsqueezy_customer_id = $3, lemonsqueezy_subscription_id = $4, \
                 lemonsqueezy_variant_id = $5, updated_at = now() \
                 WHERE id = $1",
            )
            .bind(user_id)
            .bind(tier)
            .bind(customer_id.map(|c| c.to_string()))
            .bind(subscription_id)
            .bind(variant_id.map(|v| v.to_string()))
            .execute(&pool)
            .await?;
        }

        "subscription_updated" => {
            // Tier may have changed (upgrade/downgrade) — keep usage counters
            let tier = variant_id.map(variant_to_tier).unwrap_or("pro");
            sqlx::query(
                "UPDATE users SET plan = $2, lemonsqueezy_variant_id = $3, updated_at = now() \
                 WHERE lemonsqueezy_subscription_id = $1",
            )
            .bind(subscription_id)
            .bind(tier)
            .bind(variant_id.map(|v| v.to_string()))
            .execute(&pool)
            .await?;
        }

        "subscription_payment_success" => {
            // Payment succeeded — clear any grace period
            sqlx::query(
                "UPDATE users SET grace_period_end = NULL, pre_grace_plan = NULL, updated_at = now() \
                 WHERE lemonsqueezy_subscription_id = $1",
            )
            .bind(subscription_id)
            .execute(&pool)
            .await?;
        }

        "subscription_payment_failed" => {
            // Payment failed — set 3-day grace period
            sqlx::query(
                "UPDATE users SET grace_period_end = now() + INTERVAL '3 days', \
                 pre_grace_plan = plan::text, updated_at = now() \
                 WHERE lemonsqueezy_subscription_id = $1",
            )
            .bind(subscription_id)
            .execute(&pool)
            .await?;
        }

        "subscription_cancelled" | "subscription_expired" => {
            // Downgrade to free
            sqlx::query(
                "UPDATE users SET plan = 'free', plan_expires_at = now(), \
                 lemonsqueezy_customer_id = NULL, lemonsqueezy_subscription_id = NULL, \
                 lemonsqueezy_variant_id = NULL, grace_period_end = NULL, pre_grace_plan = NULL, \
                 updated_at = now() \
                 WHERE lemonsqueezy_subscription_id = $1",
            )
            .bind(subscription_id)
            .execute(&pool)
            .await?;
        }

        _ => {
            tracing::debug!("Unhandled LemonSqueezy event: {event}");
        }
    }

    Ok(StatusCode::OK)
}

// ---------------------------------------------------------------------------
// POST /api/v1/billing/checkout — create a LemonSqueezy checkout session
// ---------------------------------------------------------------------------

async fn checkout(
    auth: AuthUser,
    Extension(config): Extension<Config>,
    Json(body): Json<CheckoutRequest>,
) -> Result<Json<ApiResponse<CheckoutResponse>>, AppError> {
    let variant_id = tier_to_variant(&body.tier).ok_or_else(|| {
        AppError::BadRequest(format!("Invalid tier: {}. Must be 'pro' or 'team'.", body.tier))
    })?;

    if config.lemonsqueezy_api_key.is_empty() {
        return Err(AppError::Internal(
            "LemonSqueezy API key not configured".to_string(),
        ));
    }

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.lemonsqueezy.com/v1/checkouts")
        .bearer_auth(&config.lemonsqueezy_api_key)
        .json(&serde_json::json!({
            "data": {
                "type": "checkouts",
                "attributes": {
                    "custom_data": {
                        "user_id": auth.user_id.to_string()
                    },
                    "checkout_data": {
                        "email": ""
                    }
                },
                "relationships": {
                    "store": {
                        "data": { "type": "stores", "id": "1" }
                    },
                    "variant": {
                        "data": { "type": "variants", "id": variant_id.to_string() }
                    }
                }
            }
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("LemonSqueezy API error: {e}")))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "LemonSqueezy checkout failed ({status}): {text}"
        )));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse LemonSqueezy response: {e}")))?;

    let checkout_url = json["data"]["attributes"]["url"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ApiResponse::ok(CheckoutResponse { checkout_url }))
}

// ---------------------------------------------------------------------------
// GET /api/v1/billing/portal — return LemonSqueezy customer portal URL
// ---------------------------------------------------------------------------

async fn portal(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<PortalResponse>>, AppError> {
    let customer_id: Option<String> = sqlx::query_scalar(
        "SELECT lemonsqueezy_customer_id FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_one(&pool)
    .await?;

    let customer_id = customer_id.ok_or_else(|| {
        AppError::NotFound("No billing account found. Subscribe first.".to_string())
    })?;

    // LemonSqueezy customer portal URL format
    let portal_url = format!(
        "https://app.lemonsqueezy.com/my-orders/customer/{}",
        customer_id
    );

    Ok(ApiResponse::ok(PortalResponse { portal_url }))
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/billing/webhook", post(webhook))
        .route("/api/v1/billing/checkout", post(checkout))
        .route("/api/v1/billing/portal", get(portal))
}
