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
    let filter = params.filter.as_deref().unwrap_or("all");

    let include_entities = matches!(filter, "entities" | "all");
    let include_concepts = matches!(filter, "concepts" | "all");
    let include_locations = matches!(filter, "locations" | "all");

    // ---------------------------------------------------------------
    // Fetch entity/location/concept rows concurrently.
    // Each query uses a LEFT JOIN + GROUP BY to get counts in one round-trip
    // instead of a separate COUNT query per node (N+1 elimination).
    // ---------------------------------------------------------------

    // Row types for the aggregated queries
    #[derive(sqlx::FromRow)]
    struct EntityRow {
        id: uuid::Uuid,
        name: String,
        entity_type: String,
        note_count: i64,
    }

    #[derive(sqlx::FromRow)]
    struct ConceptRow {
        id: uuid::Uuid,
        name: String,
        note_count: i64,
    }

    let entity_fut = async {
        if include_entities {
            sqlx::query_as::<_, EntityRow>(
                "SELECT e.id, e.name, e.entity_type::text, \
                        COALESCE(SUM(ne.mention_count), 0)::BIGINT AS note_count \
                 FROM entities e \
                 LEFT JOIN note_entities ne ON ne.entity_id = e.id \
                 WHERE e.workspace_id = $1 AND e.entity_type::text IN ('person', 'artifact') \
                 GROUP BY e.id, e.name, e.entity_type",
            )
            .bind(auth.workspace_id)
            .fetch_all(&pool)
            .await
        } else {
            Ok(vec![])
        }
    };

    let location_fut = async {
        if include_locations {
            sqlx::query_as::<_, EntityRow>(
                "SELECT e.id, e.name, e.entity_type::text, \
                        COALESCE(SUM(ne.mention_count), 0)::BIGINT AS note_count \
                 FROM entities e \
                 LEFT JOIN note_entities ne ON ne.entity_id = e.id \
                 WHERE e.workspace_id = $1 AND e.entity_type::text = 'location' \
                 GROUP BY e.id, e.name, e.entity_type",
            )
            .bind(auth.workspace_id)
            .fetch_all(&pool)
            .await
        } else {
            Ok(vec![])
        }
    };

    let concept_fut = async {
        if include_concepts {
            sqlx::query_as::<_, ConceptRow>(
                "SELECT c.id, c.name, \
                        COUNT(nc.note_id)::BIGINT AS note_count \
                 FROM concepts c \
                 LEFT JOIN note_concepts nc ON nc.concept_id = c.id \
                 WHERE c.workspace_id = $1 \
                 GROUP BY c.id, c.name",
            )
            .bind(auth.workspace_id)
            .fetch_all(&pool)
            .await
        } else {
            Ok(vec![])
        }
    };

    let (entity_rows, location_rows, concept_rows) =
        tokio::try_join!(entity_fut, location_fut, concept_fut)?;

    let mut nodes: Vec<GraphNode> = Vec::with_capacity(
        entity_rows.len() + location_rows.len() + concept_rows.len(),
    );

    for row in entity_rows {
        nodes.push(GraphNode {
            id: row.id,
            label: row.name,
            node_type: "entity".to_string(),
            entity_type: row.entity_type,
            note_count: row.note_count,
        });
    }

    for row in location_rows {
        nodes.push(GraphNode {
            id: row.id,
            label: row.name,
            node_type: "location".to_string(),
            entity_type: "location".to_string(),
            note_count: row.note_count,
        });
    }

    for row in concept_rows {
        nodes.push(GraphNode {
            id: row.id,
            label: row.name,
            node_type: "concept".to_string(),
            entity_type: String::new(),
            note_count: row.note_count,
        });
    }

    // ---------------------------------------------------------------
    // Edges — only include edges where both endpoints are in our node set
    // ---------------------------------------------------------------
    let node_ids: Vec<uuid::Uuid> = nodes.iter().map(|n| n.id).collect();
    let edges: Vec<GraphEdgeOut> = if node_ids.is_empty() {
        vec![]
    } else {
        let raw = sqlx::query_as::<_, GraphEdge>(
            "SELECT id, workspace_id, source_type, source_id, target_type, target_id, \
                    edge_type::text AS edge_type, strength, label, is_dashed, created_at, updated_at \
             FROM graph_edges \
             WHERE workspace_id = $1 \
               AND source_id = ANY($2) AND target_id = ANY($2)",
        )
        .bind(auth.workspace_id)
        .bind(&node_ids)
        .fetch_all(&pool)
        .await?;

        raw.into_iter()
            .map(|e| GraphEdgeOut {
                id: e.id,
                source: e.source_id,
                target: e.target_id,
                edge_type: e.edge_type,
                strength: e.strength,
                label: e.label,
                is_dashed: e.is_dashed,
            })
            .collect()
    };

    Ok(ApiResponse::ok(GraphData { nodes, edges }))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/api/v1/graph", get(get_graph))
}
