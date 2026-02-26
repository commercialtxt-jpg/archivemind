use chrono::{DateTime, Datelike, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::budget;
use crate::models::plan::{PlanLimits, PlanTier};

/// Get the current period start (first day of current month).
fn current_period_start() -> chrono::NaiveDate {
    let now = Utc::now().naive_utc().date();
    chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap()
}

/// Row type for grace period query.
#[derive(sqlx::FromRow)]
struct GraceRow {
    plan: String,
    grace_period_end: Option<DateTime<Utc>>,
    pre_grace_plan: Option<String>,
}

/// Fetch the user's plan tier from the users table, handling grace period logic.
///
/// - If `grace_period_end` is set and still in the future, return `pre_grace_plan` tier
///   (the user keeps their paid plan during the grace window).
/// - If `grace_period_end` is set and in the past, auto-downgrade to Free, clear grace fields.
async fn get_user_tier(pool: &PgPool, user_id: Uuid) -> Result<PlanTier, AppError> {
    let row = sqlx::query_as::<_, GraceRow>(
        "SELECT plan::text, grace_period_end, pre_grace_plan FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let now = Utc::now();

    if let Some(grace_end) = row.grace_period_end {
        if now < grace_end {
            // Still within grace period — honour the pre-grace plan
            let tier = row
                .pre_grace_plan
                .as_deref()
                .map(PlanTier::from_str)
                .unwrap_or(PlanTier::Free);
            return Ok(tier);
        } else {
            // Grace expired — auto-downgrade to Free
            sqlx::query(
                "UPDATE users SET plan = 'free', grace_period_end = NULL, pre_grace_plan = NULL, \
                 plan_expires_at = now(), updated_at = now() WHERE id = $1",
            )
            .bind(user_id)
            .execute(pool)
            .await?;
            return Ok(PlanTier::Free);
        }
    }

    Ok(PlanTier::from_str(&row.plan))
}

/// Check the platform-wide budget for a resource and enforce throttling by tier.
///
/// - ≥80% utilization → block Free tier
/// - ≥95% utilization → block Free and Pro (only Team allowed)
/// - ≥100% utilization → block everyone
pub async fn check_platform_budget(
    pool: &PgPool,
    resource: &str,
    tier: PlanTier,
) -> Result<(), AppError> {
    let utilization = budget::get_budget_utilization(pool, resource).await?;

    if utilization >= 1.0 {
        return Err(AppError::Forbidden(
            "Platform resource limit reached. Maps are temporarily unavailable.".to_string(),
        ));
    }
    if utilization >= 0.95 && tier != PlanTier::Team {
        return Err(AppError::Forbidden(
            "Maps temporarily limited to Team plans during peak usage. Upgrade for guaranteed access.".to_string(),
        ));
    }
    if utilization >= 0.80 && tier == PlanTier::Free {
        return Err(AppError::Forbidden(
            "Maps temporarily limited on Free plan. Upgrade for guaranteed access.".to_string(),
        ));
    }

    Ok(())
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

    // For cumulative resources (notes, entities, media, storage), use live DB counts
    // so pre-existing data counts against the limit. For rate-based resources (map_loads),
    // use the tracking table.
    let current: i64 = match resource {
        "notes" => {
            sqlx::query_scalar(
                "SELECT COUNT(*) FROM notes WHERE workspace_id = $1 AND deleted_at IS NULL",
            )
            .bind(workspace_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0)
        }
        "entities" => {
            sqlx::query_scalar("SELECT COUNT(*) FROM entities WHERE workspace_id = $1")
                .bind(workspace_id)
                .fetch_one(pool)
                .await
                .unwrap_or(0)
        }
        "media_uploads" => {
            sqlx::query_scalar("SELECT COUNT(*) FROM media")
                .fetch_one(pool)
                .await
                .unwrap_or(0)
        }
        "storage_bytes" => {
            sqlx::query_scalar("SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT FROM media")
                .fetch_one(pool)
                .await
                .unwrap_or(0)
        }
        "map_loads" => {
            let usage = ensure_usage_record(pool, user_id, workspace_id).await?;
            usage.map_loads as i64
        }
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
