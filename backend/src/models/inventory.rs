use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct InventoryItem {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub icon: String,
    pub status: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInventoryItem {
    pub name: String,
    pub icon: Option<String>,
    pub status: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInventoryItem {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub status: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct InventoryAlert {
    pub items: Vec<InventoryItem>,
    pub count: i64,
}
