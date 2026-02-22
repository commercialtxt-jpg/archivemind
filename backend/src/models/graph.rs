use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct GraphEdge {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub source_type: String,
    pub source_id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub edge_type: String,
    pub strength: f32,
    pub label: Option<String>,
    pub is_dashed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub id: Uuid,
    pub label: String,
    pub node_type: String,
    pub note_count: i64,
}

#[derive(Debug, Serialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdgeOut>,
}

#[derive(Debug, Serialize)]
pub struct GraphEdgeOut {
    pub id: Uuid,
    pub source: Uuid,
    pub target: Uuid,
    pub edge_type: String,
    pub strength: f32,
    pub label: Option<String>,
    pub is_dashed: bool,
}

#[derive(Debug, Deserialize)]
pub struct GraphFilter {
    pub filter: Option<String>,
}
