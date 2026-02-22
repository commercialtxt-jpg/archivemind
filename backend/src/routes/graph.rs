use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::graph::*;
use crate::response::ApiResponse;

async fn get_graph(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Query(params): Query<GraphFilter>,
) -> Result<Json<ApiResponse<GraphData>>, AppError> {
    let mut nodes: Vec<GraphNode> = Vec::new();

    let include_entities = matches!(params.filter.as_deref(), None | Some("interviews") | Some("all"));
    let include_concepts = matches!(params.filter.as_deref(), None | Some("concepts") | Some("all"));
    let include_locations = matches!(params.filter.as_deref(), None | Some("locations") | Some("all"));

    // Fetch entity nodes (persons, artifacts)
    if include_entities {
        let entities = sqlx::query_as::<_, (uuid::Uuid, String, String)>(
            "SELECT e.id, e.name, e.entity_type::text \
             FROM entities e \
             WHERE e.workspace_id = $1 AND e.entity_type::text IN ('person', 'artifact')"
        )
        .bind(auth.workspace_id)
        .fetch_all(&pool)
        .await?;

        for (id, name, entity_type) in entities {
            let count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM note_entities WHERE entity_id = $1"
            )
            .bind(id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            nodes.push(GraphNode {
                id,
                label: name,
                node_type: entity_type,
                note_count: count,
            });
        }
    }

    // Fetch location nodes
    if include_locations {
        let locations = sqlx::query_as::<_, (uuid::Uuid, String)>(
            "SELECT e.id, e.name \
             FROM entities e \
             WHERE e.workspace_id = $1 AND e.entity_type::text = 'location'"
        )
        .bind(auth.workspace_id)
        .fetch_all(&pool)
        .await?;

        for (id, name) in locations {
            let count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM note_entities WHERE entity_id = $1"
            )
            .bind(id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            nodes.push(GraphNode {
                id,
                label: name,
                node_type: "location".to_string(),
                note_count: count,
            });
        }
    }

    // Fetch concept nodes
    if include_concepts {
        let concepts = sqlx::query_as::<_, (uuid::Uuid, String)>(
            "SELECT c.id, c.name FROM concepts c WHERE c.workspace_id = $1"
        )
        .bind(auth.workspace_id)
        .fetch_all(&pool)
        .await?;

        for (id, name) in concepts {
            let count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM note_concepts WHERE concept_id = $1"
            )
            .bind(id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            nodes.push(GraphNode {
                id,
                label: name,
                node_type: "concept".to_string(),
                note_count: count,
            });
        }
    }

    // Fetch edges
    let node_ids: Vec<uuid::Uuid> = nodes.iter().map(|n| n.id).collect();
    let edges = if node_ids.is_empty() {
        vec![]
    } else {
        let raw_edges = sqlx::query_as::<_, GraphEdge>(
            "SELECT id, workspace_id, source_type, source_id, target_type, target_id, \
                    edge_type::text as edge_type, strength, label, is_dashed, created_at, updated_at \
             FROM graph_edges \
             WHERE workspace_id = $1 \
               AND source_id = ANY($2) AND target_id = ANY($2)"
        )
        .bind(auth.workspace_id)
        .bind(&node_ids)
        .fetch_all(&pool)
        .await?;

        raw_edges.into_iter().map(|e| GraphEdgeOut {
            id: e.id,
            source: e.source_id,
            target: e.target_id,
            edge_type: e.edge_type,
            strength: e.strength,
            label: e.label,
            is_dashed: e.is_dashed,
        }).collect()
    };

    Ok(ApiResponse::ok(GraphData { nodes, edges }))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/graph", get(get_graph))
}
