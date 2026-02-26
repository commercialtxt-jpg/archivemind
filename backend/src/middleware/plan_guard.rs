use chrono::{Datelike, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::plan::{PlanLimits, PlanTier, UserPlanRow};

/// Get the current period start (first day of current month).
fn current_period_start() -> chrono::NaiveDate {
    let now = Utc::now().naive_utc().date();
    chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap()
}

/// Fetch the user's plan tier from the users table.
async fn get_user_tier(pool: &PgPool, user_id: Uuid) -> Result<PlanTier, AppError> {
    let row = sqlx::query_as::<_, UserPlanRow>(
        "SELECT plan::text, plan_started_at, plan_expires_at FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(PlanTier::from_str(&row.plan))
}

/// Ensure or fetch the current month's usage record, creating it if absent.
async fn ensure_usage_record(
    pool: &PgPool,
    user_id: Uuid,
    workspace_id: Uuid,
) -> Result<crate::models::plan::UsageRecord, AppError> {
    let period = current_period_start();

    let record = sqlx::query_as::<_, crate::models::plan::UsageRecord>(
        "INSERT INTO usage_tracking (user_id, workspace_id, period_start) \
         VALUES ($1, $2, $3) \
         ON CONFLICT (user_id, period_start) DO UPDATE SET updated_at = now() \
         RETURNING *",
    )
    .bind(user_id)
    .bind(workspace_id)
    .bind(period)
    .fetch_one(pool)
    .await?;

    Ok(record)
}

/// Check whether the user has reached their plan limit for the given resource.
/// Returns `Ok(())` if under the limit, or `Err(AppError)` with a 403 Forbidden.
///
/// `resource` should be one of: "notes", "entities", "media_uploads", "map_loads", "storage_bytes".
pub async fn check_limit(
    pool: &PgPool,
    user_id: Uuid,
    workspace_id: Uuid,
    resource: &str,
) -> Result<(), AppError> {
    let tier = get_user_tier(pool, user_id).await?;
    let limits = PlanLimits::for_tier(tier);

    // Unlimited resources always pass
    if limits.is_unlimited(resource) {
        return Ok(());
    }

    let limit = limits.limit_for(resource);
    if limit <= 0 && resource == "ai_requests" {
        return Err(AppError::Forbidden(format!(
            "AI features are not available on the {} plan",
            serde_json::to_string(&tier).unwrap_or_default().trim_matches('"')
        )));
    }

    let usage = ensure_usage_record(pool, user_id, workspace_id).await?;

    let current: i64 = match resource {
        "notes" => usage.notes_count as i64,
        "entities" => usage.entities_count as i64,
        "media_uploads" => usage.media_uploads as i64,
        "map_loads" => usage.map_loads as i64,
        "storage_bytes" => usage.storage_bytes,
        _ => 0,
    };

    if current >= limit {
        let tier_name = serde_json::to_string(&tier)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string();
        return Err(AppError::Forbidden(format!(
            "Plan limit reached for {resource}. Current: {current}, Limit: {limit} ({tier_name} plan). Upgrade your plan for higher limits."
        )));
    }

    Ok(())
}

/// Increment a usage counter for the current period.
/// `resource` should be one of: "notes_count", "entities_count", "media_uploads", "map_loads".
/// For `storage_bytes`, pass the byte delta.
pub async fn increment_usage(
    pool: &PgPool,
    user_id: Uuid,
    workspace_id: Uuid,
    resource: &str,
    amount: i64,
) -> Result<(), AppError> {
    let period = current_period_start();

    // Upsert the record and increment the appropriate column
    let sql = match resource {
        "notes_count" => {
            "INSERT INTO usage_tracking (user_id, workspace_id, period_start, notes_count) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (user_id, period_start) DO UPDATE SET notes_count = usage_tracking.notes_count + $4, updated_at = now()"
        }
        "entities_count" => {
            "INSERT INTO usage_tracking (user_id, workspace_id, period_start, entities_count) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (user_id, period_start) DO UPDATE SET entities_count = usage_tracking.entities_count + $4, updated_at = now()"
        }
        "media_uploads" => {
            "INSERT INTO usage_tracking (user_id, workspace_id, period_start, media_uploads) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (user_id, period_start) DO UPDATE SET media_uploads = usage_tracking.media_uploads + $4, updated_at = now()"
        }
        "map_loads" => {
            "INSERT INTO usage_tracking (user_id, workspace_id, period_start, map_loads) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (user_id, period_start) DO UPDATE SET map_loads = usage_tracking.map_loads + $4, updated_at = now()"
        }
        "storage_bytes" => {
            "INSERT INTO usage_tracking (user_id, workspace_id, period_start, storage_bytes) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (user_id, period_start) DO UPDATE SET storage_bytes = usage_tracking.storage_bytes + $4, updated_at = now()"
        }
        _ => return Ok(()),
    };

    if resource == "storage_bytes" {
        // storage_bytes is BIGINT, bind as i64
        sqlx::query(sql)
            .bind(user_id)
            .bind(workspace_id)
            .bind(period)
            .bind(amount)
            .execute(pool)
            .await?;
    } else {
        sqlx::query(sql)
            .bind(user_id)
            .bind(workspace_id)
            .bind(period)
            .bind(amount as i32)
            .execute(pool)
            .await?;
    }

    Ok(())
}
