use chrono::{DateTime, Datelike, NaiveDate, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BudgetRecord {
    pub id: Uuid,
    pub resource: String,
    pub period_start: NaiveDate,
    pub current: i64,
    pub cap: i64,
    pub updated_at: DateTime<Utc>,
}

/// Upsert and increment the platform-wide budget counter for the current month.
pub async fn increment_platform_budget(
    pool: &PgPool,
    resource: &str,
    cap: i64,
    amount: i64,
) -> Result<BudgetRecord, AppError> {
    let now = Utc::now().naive_utc().date();
    let period = NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();

    let record = sqlx::query_as::<_, BudgetRecord>(
        "INSERT INTO platform_budget (resource, period_start, current, cap) \
         VALUES ($1, $2, $3, $4) \
         ON CONFLICT (resource, period_start) DO UPDATE \
           SET current = platform_budget.current + $3, updated_at = now() \
         RETURNING *",
    )
    .bind(resource)
    .bind(period)
    .bind(amount)
    .bind(cap)
    .fetch_one(pool)
    .await?;

    Ok(record)
}

/// Get the current utilization ratio (0.0–1.0) for a platform resource this month.
pub async fn get_budget_utilization(pool: &PgPool, resource: &str) -> Result<f64, AppError> {
    let now = Utc::now().naive_utc().date();
    let period = NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();

    let row = sqlx::query_as::<_, BudgetRecord>(
        "SELECT * FROM platform_budget WHERE resource = $1 AND period_start = $2",
    )
    .bind(resource)
    .bind(period)
    .fetch_optional(pool)
    .await?;

    match row {
        Some(r) if r.cap > 0 => Ok(r.current as f64 / r.cap as f64),
        _ => Ok(0.0),
    }
}
