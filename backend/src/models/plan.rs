use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Plan tier
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlanTier {
    Free,
    Pro,
    Team,
}

impl PlanTier {
    pub fn from_str(s: &str) -> Self {
        match s {
            "pro" => Self::Pro,
            "team" => Self::Team,
            _ => Self::Free,
        }
    }
}

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct PlanLimits {
    pub tier: PlanTier,
    pub map_loads: i32,
    pub storage_bytes: i64,
    pub notes: i32,
    pub entities: i32,
    pub media_uploads: i32,
    pub ai_requests: i32,
    pub workspaces: i32,
    pub team_members: i32,
    pub price_cents: i32,
}

impl PlanLimits {
    pub fn for_tier(tier: PlanTier) -> Self {
        match tier {
            PlanTier::Free => Self {
                tier,
                map_loads: 50,
                storage_bytes: 100 * 1024 * 1024, // 100 MB
                notes: 50,
                entities: 25,
                media_uploads: 20,
                ai_requests: 0,
                workspaces: 1,
                team_members: 1,
                price_cents: 0,
            },
            PlanTier::Pro => Self {
                tier,
                map_loads: 2_000,
                storage_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
                notes: -1, // unlimited
                entities: -1,
                media_uploads: 500,
                ai_requests: 100,
                workspaces: 1,
                team_members: 1,
                price_cents: 900,
            },
            PlanTier::Team => Self {
                tier,
                map_loads: 10_000,
                storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
                notes: -1,
                entities: -1,
                media_uploads: 2_000,
                ai_requests: 500,
                workspaces: 5,
                team_members: 10,
                price_cents: 2900,
            },
        }
    }

    /// Returns true if the resource is unlimited (-1) for this tier.
    pub fn is_unlimited(&self, resource: &str) -> bool {
        match resource {
            "notes" => self.notes < 0,
            "entities" => self.entities < 0,
            _ => false,
        }
    }

    pub fn limit_for(&self, resource: &str) -> i64 {
        match resource {
            "map_loads" => self.map_loads as i64,
            "storage_bytes" => self.storage_bytes,
            "notes" => self.notes as i64,
            "entities" => self.entities as i64,
            "media_uploads" => self.media_uploads as i64,
            "ai_requests" => self.ai_requests as i64,
            _ => 0,
        }
    }
}

// ---------------------------------------------------------------------------
// Usage record
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UsageRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub workspace_id: Uuid,
    pub period_start: NaiveDate,
    pub map_loads: i32,
    pub media_uploads: i32,
    pub storage_bytes: i64,
    pub notes_count: i32,
    pub entities_count: i32,
    pub ai_requests: i32,
    pub updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// User plan info (joined from users table)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserPlanRow {
    pub plan: String,
    pub plan_started_at: Option<DateTime<Utc>>,
    pub plan_expires_at: Option<DateTime<Utc>>,
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct UsageResponse {
    pub plan: PlanTier,
    pub limits: PlanLimits,
    pub usage: UsageRecord,
    pub plan_started_at: Option<DateTime<Utc>>,
    pub plan_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}
