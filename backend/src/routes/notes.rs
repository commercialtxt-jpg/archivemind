use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::middleware::plan_guard;
use crate::models::entity::Entity;
use crate::models::note::*;
use crate::response::ApiResponse;

// ---------------------------------------------------------------------------
// Tiptap JSON helpers
// ---------------------------------------------------------------------------

/// Recursively walks a Tiptap JSON document and collects all nodes of the
/// given `node_type`, returning their `attrs` objects.
fn collect_nodes<'a>(
    value: &'a serde_json::Value,
    node_type: &str,
    out: &mut Vec<&'a serde_json::Value>,
) {
    if let Some(t) = value.get("type").and_then(|v| v.as_str()) {
        if t == node_type {
            if let Some(attrs) = value.get("attrs") {
                out.push(attrs);
            }
            return; // atom node — no children to recurse into
        }
    }
    // Recurse into `content` array
    if let Some(content) = value.get("content").and_then(|v| v.as_array()) {
        for child in content {
            collect_nodes(child, node_type, out);
        }
    }
}

/// Parse an entity UUID from a Tiptap `entity_mention` attrs object.
/// Returns `None` if the `id` field is missing or not a valid UUID string.
fn parse_uuid_attr(attrs: &serde_json::Value, key: &str) -> Option<Uuid> {
    attrs
        .get(key)
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
}

/// Extract entity ids → mention counts and concept ids from a Tiptap JSON body.
/// Returns `(entity_counts, concept_ids)`.
fn extract_mentions(body: &serde_json::Value) -> (Vec<(Uuid, i32)>, Vec<Uuid>) {
    // --- entity mentions ---
    let mut entity_attrs: Vec<&serde_json::Value> = Vec::new();
    collect_nodes(body, "entityMention", &mut entity_attrs);

    let mut entity_counts: std::collections::HashMap<Uuid, i32> = std::collections::HashMap::new();
    for attrs in &entity_attrs {
        if let Some(id) = parse_uuid_attr(attrs, "id") {
            *entity_counts.entry(id).or_insert(0) += 1;
        }
    }
    let entity_counts: Vec<(Uuid, i32)> = entity_counts.into_iter().collect();

    // --- concept tags ---
    let mut concept_attrs: Vec<&serde_json::Value> = Vec::new();
    collect_nodes(body, "conceptTag", &mut concept_attrs);

    let mut concept_ids: Vec<Uuid> = Vec::new();
    let mut seen_concepts: std::collections::HashSet<Uuid> = std::collections::HashSet::new();
    for attrs in &concept_attrs {
        if let Some(id) = parse_uuid_attr(attrs, "id") {
            if seen_concepts.insert(id) {
                concept_ids.push(id);
            }
        }
    }

    (entity_counts, concept_ids)
}

/// Re-link entities and concepts for a note based on its Tiptap JSON body,
/// then regenerate graph edges. Runs inside the caller's transaction.
async fn sync_note_links(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    workspace_id: Uuid,
    note_id: Uuid,
    body: &serde_json::Value,
) -> Result<(), AppError> {
    let (entity_counts, concept_ids) = extract_mentions(body);

    // ------------------------------------------------------------------
    // 1. Rebuild note_entities
    // ------------------------------------------------------------------
    sqlx::query("DELETE FROM note_entities WHERE note_id = $1")
        .bind(note_id)
        .execute(&mut **tx)
        .await?;

    for (entity_id, count) in &entity_counts {
        sqlx::query(
            "INSERT INTO note_entities (note_id, entity_id, mention_count) \
             VALUES ($1, $2, $3) \
             ON CONFLICT (note_id, entity_id) DO UPDATE SET mention_count = EXCLUDED.mention_count",
        )
        .bind(note_id)
        .bind(entity_id)
        .bind(count)
        .execute(&mut **tx)
        .await?;
    }

    // ------------------------------------------------------------------
    // 2. Rebuild note_concepts
    // ------------------------------------------------------------------
    sqlx::query("DELETE FROM note_concepts WHERE note_id = $1")
        .bind(note_id)
        .execute(&mut **tx)
        .await?;

    for concept_id in &concept_ids {
        sqlx::query(
            "INSERT INTO note_concepts (note_id, concept_id) \
             VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(note_id)
        .bind(concept_id)
        .execute(&mut **tx)
        .await?;
    }

    // ------------------------------------------------------------------
    // 3. Regenerate graph edges for this note
    //    We only touch edges where both endpoints are within this note's
    //    entity/concept set (entity_co_mention, entity_concept).
    //    Delete existing edges that involve these node pairs, then reinsert.
    // ------------------------------------------------------------------

    // Delete old co-mention edges among entities that were linked to this note
    // and old entity↔concept edges for this workspace derived from this note.
    // Simplest safe approach: delete edges whose source+target are in the
    // entity/concept sets touched by this note.
    let all_entity_ids: Vec<Uuid> = entity_counts.iter().map(|(id, _)| *id).collect();
    let all_concept_ids: Vec<Uuid> = concept_ids.clone();

    if !all_entity_ids.is_empty() {
        // Remove stale entity_co_mention edges among these entities
        sqlx::query(
            "DELETE FROM graph_edges \
             WHERE workspace_id = $1 \
               AND edge_type = 'entity_co_mention' \
               AND source_id = ANY($2) \
               AND target_id = ANY($2)",
        )
        .bind(workspace_id)
        .bind(&all_entity_ids)
        .execute(&mut **tx)
        .await?;

        // Recompute entity_co_mention edges: for every pair of entities
        // that share at least one note (in this workspace), upsert an edge
        // whose strength = number of notes they share.
        let pairs = sqlx::query_as::<_, (Uuid, Uuid, i64)>(
            "SELECT ne1.entity_id, ne2.entity_id, COUNT(DISTINCT ne1.note_id) \
             FROM note_entities ne1 \
             JOIN note_entities ne2 \
               ON ne1.note_id = ne2.note_id AND ne1.entity_id < ne2.entity_id \
             JOIN notes n ON n.id = ne1.note_id \
             WHERE n.workspace_id = $1 \
               AND (ne1.entity_id = ANY($2) OR ne2.entity_id = ANY($2)) \
             GROUP BY ne1.entity_id, ne2.entity_id \
             HAVING COUNT(DISTINCT ne1.note_id) > 0",
        )
        .bind(workspace_id)
        .bind(&all_entity_ids)
        .fetch_all(&mut **tx)
        .await?;

        for (src, tgt, shared) in pairs {
            let weight = (shared as f32).min(10.0) / 10.0; // normalise 0.0–1.0
            sqlx::query(
                "INSERT INTO graph_edges \
                 (workspace_id, source_type, source_id, target_type, target_id, edge_type, strength) \
                 VALUES ($1, 'entity', $2, 'entity', $3, 'entity_co_mention', $4) \
                 ON CONFLICT (workspace_id, source_type, source_id, target_type, target_id, edge_type) \
                 DO UPDATE SET strength = EXCLUDED.strength, updated_at = now()",
            )
            .bind(workspace_id)
            .bind(src)
            .bind(tgt)
            .bind(weight)
            .execute(&mut **tx)
            .await?;
        }
    }

    if !all_entity_ids.is_empty() && !all_concept_ids.is_empty() {
        // Remove stale entity_concept edges
        sqlx::query(
            "DELETE FROM graph_edges \
             WHERE workspace_id = $1 \
               AND edge_type = 'entity_concept' \
               AND source_id = ANY($2) \
               AND target_id = ANY($3)",
        )
        .bind(workspace_id)
        .bind(&all_entity_ids)
        .bind(&all_concept_ids)
        .execute(&mut **tx)
        .await?;

        // Recompute entity_concept edges
        let ec_pairs = sqlx::query_as::<_, (Uuid, Uuid, i64)>(
            "SELECT ne.entity_id, nc.concept_id, COUNT(DISTINCT ne.note_id) \
             FROM note_entities ne \
             JOIN note_concepts nc ON nc.note_id = ne.note_id \
             JOIN notes n ON n.id = ne.note_id \
             WHERE n.workspace_id = $1 \
               AND ne.entity_id = ANY($2) \
               AND nc.concept_id = ANY($3) \
             GROUP BY ne.entity_id, nc.concept_id",
        )
        .bind(workspace_id)
        .bind(&all_entity_ids)
        .bind(&all_concept_ids)
        .fetch_all(&mut **tx)
        .await?;

        for (entity_id, concept_id, count) in ec_pairs {
            let weight = (count as f32).min(10.0) / 10.0;
            sqlx::query(
                "INSERT INTO graph_edges \
                 (workspace_id, source_type, source_id, target_type, target_id, edge_type, strength) \
                 VALUES ($1, 'entity', $2, 'concept', $3, 'entity_concept', $4) \
                 ON CONFLICT (workspace_id, source_type, source_id, target_type, target_id, edge_type) \
                 DO UPDATE SET strength = EXCLUDED.strength, updated_at = now()",
            )
            .bind(workspace_id)
            .bind(entity_id)
            .bind(concept_id)
            .bind(weight)
            .execute(&mut **tx)
            .await?;
        }
    }

    Ok(())
}

async fn list_notes(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Query(filters): Query<NoteFilters>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let page = filters.page.unwrap_or(1).max(1);
    let per_page = filters.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;
    let show_deleted = filters.deleted.unwrap_or(false);

    if filters.count_only.unwrap_or(false) {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM notes WHERE workspace_id = $1 AND deleted_at IS NULL",
        )
        .bind(auth.workspace_id)
        .fetch_one(&pool)
        .await?;

        let starred: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM notes WHERE workspace_id = $1 AND deleted_at IS NULL AND is_starred = true"
        )
        .bind(auth.workspace_id)
        .fetch_one(&pool)
        .await?;

        let deleted: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM notes WHERE workspace_id = $1 AND deleted_at IS NOT NULL",
        )
        .bind(auth.workspace_id)
        .fetch_one(&pool)
        .await?;

        let counts = NoteCount {
            total,
            starred,
            deleted,
        };
        return Ok(ApiResponse::ok(serde_json::to_value(counts).unwrap()));
    }

    // Build dynamic query
    let mut conditions = vec!["n.workspace_id = $1".to_string()];
    let mut param_idx = 2u32;

    if show_deleted {
        conditions.push("n.deleted_at IS NOT NULL".to_string());
    } else {
        conditions.push("n.deleted_at IS NULL".to_string());
    }

    // We'll use a simpler approach: build the full query string
    // and bind parameters positionally.
    // Tag JOIN is always included for ARRAY_AGG aggregation.
    let mut filter_joins = String::new();

    if filters.field_trip_id.is_some() {
        filter_joins.push_str(" JOIN note_field_trips nft ON nft.note_id = n.id");
        conditions.push(format!("nft.field_trip_id = ${}", param_idx));
        param_idx += 1;
    }

    if filters.concept_id.is_some() {
        filter_joins.push_str(" JOIN note_concepts nc ON nc.note_id = n.id");
        conditions.push(format!("nc.concept_id = ${}", param_idx));
        param_idx += 1;
    }

    if filters.entity_id.is_some() {
        filter_joins.push_str(" JOIN note_entities ne_filt ON ne_filt.note_id = n.id");
        conditions.push(format!("ne_filt.entity_id = ${}", param_idx));
        param_idx += 1;
    }

    if filters.entity_type.is_some() {
        filter_joins.push_str(
            " JOIN note_entities ne_et ON ne_et.note_id = n.id \
             JOIN entities ent_et ON ent_et.id = ne_et.entity_id",
        );
        conditions.push(format!("ent_et.entity_type::text = ${}", param_idx));
        param_idx += 1;
    }

    if filters.note_type.is_some() {
        conditions.push(format!("n.note_type::text = ${}", param_idx));
        param_idx += 1;
    }

    if filters.starred.unwrap_or(false) {
        conditions.push("n.is_starred = true".to_string());
    }

    let where_clause = format!(" WHERE {}", conditions.join(" AND "));
    let order = match (filters.sort.as_deref(), filters.order.as_deref()) {
        (Some("updated_at"), Some("asc")) => " ORDER BY n.updated_at ASC",
        (Some("updated_at"), _) => " ORDER BY n.updated_at DESC",
        (Some("title"), Some("asc")) => " ORDER BY n.title ASC",
        (Some("title"), _) => " ORDER BY n.title DESC",
        (_, Some("asc")) => " ORDER BY n.created_at ASC",
        _ => " ORDER BY n.created_at DESC",
    };

    // Count query does not need tag aggregation
    let count_str = format!(
        "SELECT COUNT(DISTINCT n.id) FROM notes n{}{}",
        filter_joins, where_clause
    );

    // Data query: filter joins first, then LEFT JOIN for tags + GROUP BY for aggregation
    let query_str = format!(
        "SELECT n.id, n.workspace_id, n.title, n.body_text, n.note_type::text AS note_type, n.is_starred, \
         n.location_name, n.gps_coords, n.weather, \
         COALESCE(ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::TEXT[]) AS tags, \
         n.created_at, n.updated_at \
         FROM notes n{} \
         LEFT JOIN note_tags nt ON nt.note_id = n.id \
         LEFT JOIN tags t ON t.id = nt.tag_id{} \
         GROUP BY n.id{} \
         LIMIT ${} OFFSET ${}",
        filter_joins, where_clause, order, param_idx, param_idx + 1
    );

    // Build and execute count query
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_str).bind(auth.workspace_id);
    if let Some(ref ft_id) = filters.field_trip_id {
        count_q = count_q.bind(ft_id);
    }
    if let Some(ref c_id) = filters.concept_id {
        count_q = count_q.bind(c_id);
    }
    if let Some(ref e_id) = filters.entity_id {
        count_q = count_q.bind(e_id);
    }
    if let Some(ref et) = filters.entity_type {
        count_q = count_q.bind(et);
    }
    if let Some(ref nt) = filters.note_type {
        count_q = count_q.bind(nt);
    }
    let total = count_q.fetch_one(&pool).await?;

    // Build and execute data query
    let mut data_q = sqlx::query_as::<_, NoteSummary>(&query_str).bind(auth.workspace_id);
    if let Some(ref ft_id) = filters.field_trip_id {
        data_q = data_q.bind(ft_id);
    }
    if let Some(ref c_id) = filters.concept_id {
        data_q = data_q.bind(c_id);
    }
    if let Some(ref e_id) = filters.entity_id {
        data_q = data_q.bind(e_id);
    }
    if let Some(ref et) = filters.entity_type {
        data_q = data_q.bind(et);
    }
    if let Some(ref nt) = filters.note_type {
        data_q = data_q.bind(nt);
    }
    data_q = data_q.bind(per_page).bind(offset);
    let notes = data_q.fetch_all(&pool).await?;

    Ok(ApiResponse::list(
        serde_json::to_value(notes).unwrap(),
        total,
        page,
        per_page,
    ))
}

async fn get_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Note>>, AppError> {
    let note = sqlx::query_as::<_, Note>(
        "SELECT id, workspace_id, title, body, body_text, note_type::text, is_starred, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end, created_at, updated_at, deleted_at \
         FROM notes WHERE id = $1 AND workspace_id = $2",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Note not found".to_string()))?;

    Ok(ApiResponse::ok(note))
}

async fn create_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<CreateNote>,
) -> Result<Json<ApiResponse<Note>>, AppError> {
    // Check plan limit
    plan_guard::check_limit(&pool, auth.user_id, auth.workspace_id, "notes").await?;

    let title = if body.title.is_empty() { "Untitled".to_string() } else { body.title.clone() };

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let note = sqlx::query_as::<_, Note>(
        "INSERT INTO notes (workspace_id, title, body, body_text, note_type, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end) \
         VALUES ($1, $2, $3, $4, $5::note_type, $6, $7, $8, $9, $10, $11, $12, $13) \
         RETURNING id, workspace_id, title, body, body_text, note_type::text, is_starred, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end, created_at, updated_at, deleted_at",
    )
    .bind(auth.workspace_id)
    .bind(&title)
    .bind(&body.body)
    .bind(&body.body_text)
    .bind(&body.note_type)
    .bind(&body.location_name)
    .bind(body.location_lat)
    .bind(body.location_lng)
    .bind(&body.gps_coords)
    .bind(&body.weather)
    .bind(body.temperature_c)
    .bind(body.time_start)
    .bind(body.time_end)
    .fetch_one(&mut *tx)
    .await?;

    // Associate field trips
    if let Some(ref ft_ids) = body.field_trip_ids {
        for ft_id in ft_ids {
            sqlx::query("INSERT INTO note_field_trips (note_id, field_trip_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                .bind(note.id)
                .bind(ft_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    // Create/associate tags
    if let Some(ref tag_names) = body.tag_names {
        for name in tag_names {
            let tag_id: Uuid = sqlx::query_scalar(
                "INSERT INTO tags (workspace_id, name) VALUES ($1, $2) \
                 ON CONFLICT (workspace_id, name) DO UPDATE SET name = EXCLUDED.name \
                 RETURNING id",
            )
            .bind(auth.workspace_id)
            .bind(name)
            .fetch_one(&mut *tx)
            .await?;

            sqlx::query(
                "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(note.id)
            .bind(tag_id)
            .execute(&mut *tx)
            .await?;
        }
    }

    // Associate concepts
    if let Some(ref concept_ids) = body.concept_ids {
        for c_id in concept_ids {
            sqlx::query("INSERT INTO note_concepts (note_id, concept_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                .bind(note.id)
                .bind(c_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    // Associate entities
    if let Some(ref entity_ids) = body.entity_ids {
        for e_id in entity_ids {
            sqlx::query(
                "INSERT INTO note_entities (note_id, entity_id) VALUES ($1, $2) \
                 ON CONFLICT (note_id, entity_id) DO NOTHING",
            )
            .bind(note.id)
            .bind(e_id)
            .execute(&mut *tx)
            .await?;
        }
    }

    // --- Auto-extract entities/concepts from Tiptap body and regenerate graph edges ---
    // Only parse if the body is a non-trivial object (not the default empty `{}`)
    if body.body.is_object() && !body.body.as_object().map(|o| o.is_empty()).unwrap_or(true) {
        sync_note_links(&mut tx, auth.workspace_id, note.id, &body.body).await?;
    }

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Increment usage counter (best-effort)
    let _ = plan_guard::increment_usage(&pool, auth.user_id, auth.workspace_id, "notes_count", 1).await;

    Ok(ApiResponse::ok(note))
}

async fn update_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateNote>,
) -> Result<Json<ApiResponse<Note>>, AppError> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let note = sqlx::query_as::<_, Note>(
        "UPDATE notes SET \
         title = COALESCE($3, title), \
         body = COALESCE($4, body), \
         body_text = COALESCE($5, body_text), \
         note_type = COALESCE($6::note_type, note_type), \
         location_name = COALESCE($7, location_name), \
         location_lat = COALESCE($8, location_lat), \
         location_lng = COALESCE($9, location_lng), \
         gps_coords = COALESCE($10, gps_coords), \
         weather = COALESCE($11, weather), \
         temperature_c = COALESCE($12, temperature_c), \
         time_start = COALESCE($13, time_start), \
         time_end = COALESCE($14, time_end), \
         updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL \
         RETURNING id, workspace_id, title, body, body_text, note_type::text, is_starred, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end, created_at, updated_at, deleted_at",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .bind(&body.title)
    .bind(&body.body)
    .bind(&body.body_text)
    .bind(&body.note_type)
    .bind(&body.location_name)
    .bind(body.location_lat)
    .bind(body.location_lng)
    .bind(&body.gps_coords)
    .bind(&body.weather)
    .bind(body.temperature_c)
    .bind(body.time_start)
    .bind(body.time_end)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Note not found".to_string()))?;

    // Update associations if provided
    if let Some(ref ft_ids) = body.field_trip_ids {
        sqlx::query("DELETE FROM note_field_trips WHERE note_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        for ft_id in ft_ids {
            sqlx::query("INSERT INTO note_field_trips (note_id, field_trip_id) VALUES ($1, $2)")
                .bind(id)
                .bind(ft_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    if let Some(ref tag_names) = body.tag_names {
        sqlx::query("DELETE FROM note_tags WHERE note_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        for name in tag_names {
            let tag_id: Uuid = sqlx::query_scalar(
                "INSERT INTO tags (workspace_id, name) VALUES ($1, $2) \
                 ON CONFLICT (workspace_id, name) DO UPDATE SET name = EXCLUDED.name \
                 RETURNING id",
            )
            .bind(auth.workspace_id)
            .bind(name)
            .fetch_one(&mut *tx)
            .await?;
            sqlx::query("INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)")
                .bind(id)
                .bind(tag_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    if let Some(ref concept_ids) = body.concept_ids {
        sqlx::query("DELETE FROM note_concepts WHERE note_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        for c_id in concept_ids {
            sqlx::query("INSERT INTO note_concepts (note_id, concept_id) VALUES ($1, $2)")
                .bind(id)
                .bind(c_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    if let Some(ref entity_ids) = body.entity_ids {
        sqlx::query("DELETE FROM note_entities WHERE note_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        for e_id in entity_ids {
            sqlx::query("INSERT INTO note_entities (note_id, entity_id) VALUES ($1, $2)")
                .bind(id)
                .bind(e_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    // --- Auto-extract entities/concepts from Tiptap body and regenerate graph edges ---
    if let Some(ref tiptap_body) = body.body {
        sync_note_links(&mut tx, auth.workspace_id, id, tiptap_body).await?;
    }

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(ApiResponse::ok(note))
}

async fn delete_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = sqlx::query(
        "UPDATE notes SET deleted_at = now(), updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Note not found".to_string()));
    }

    Ok(ApiResponse::ok(serde_json::json!({ "deleted": true })))
}

async fn toggle_star(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let is_starred: bool = sqlx::query_scalar(
        "UPDATE notes SET is_starred = NOT is_starred, updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL \
         RETURNING is_starred",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Note not found".to_string()))?;

    // Update stars audit table
    if is_starred {
        sqlx::query("INSERT INTO stars (user_id, note_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
            .bind(auth.user_id)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    } else {
        sqlx::query("DELETE FROM stars WHERE user_id = $1 AND note_id = $2")
            .bind(auth.user_id)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(ApiResponse::ok(
        serde_json::json!({ "is_starred": is_starred }),
    ))
}

async fn note_connections(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<ConnectedNote>>>, AppError> {
    // Verify note belongs to workspace
    let _exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM notes WHERE id = $1 AND workspace_id = $2)",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_one(&pool)
    .await?;

    let connected = sqlx::query_as::<_, ConnectedNote>(
        "SELECT n.id, n.title, n.note_type::text, ge.strength, ge.label \
         FROM graph_edges ge \
         JOIN notes n ON (\
             (ge.target_type = 'note' AND ge.target_id = n.id) \
             OR (ge.source_type = 'note' AND ge.source_id = n.id)\
         ) \
         WHERE (ge.source_id = $1 OR ge.target_id = $1) \
           AND n.id != $1 AND n.deleted_at IS NULL \
         ORDER BY ge.strength DESC",
    )
    .bind(id)
    .fetch_all(&pool)
    .await?;

    Ok(ApiResponse::ok(connected))
}

async fn restore_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = sqlx::query(
        "UPDATE notes SET deleted_at = NULL, updated_at = now() \
         WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NOT NULL",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Note not found in trash".to_string()));
    }

    Ok(ApiResponse::ok(serde_json::json!({ "restored": true })))
}

async fn permanent_delete_note(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    // Only allow hard-deleting notes that are already in the trash
    let result = sqlx::query(
        "DELETE FROM notes WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NOT NULL",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Note not found in trash".to_string()));
    }

    Ok(ApiResponse::ok(
        serde_json::json!({ "permanently_deleted": true }),
    ))
}

async fn note_entities_list(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<Entity>>>, AppError> {
    let entities = sqlx::query_as::<_, Entity>(
        "SELECT e.id, e.workspace_id, e.name, e.entity_type::text AS entity_type, \
         e.role, e.avatar_initials, e.created_at, e.updated_at \
         FROM entities e \
         JOIN note_entities ne ON ne.entity_id = e.id \
         WHERE ne.note_id = $1 AND e.workspace_id = $2 \
         ORDER BY ne.mention_count DESC NULLS LAST, e.name ASC",
    )
    .bind(id)
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = entities.len() as i64;
    Ok(ApiResponse::list(entities, total, 1, total.max(1)))
}

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/notes", get(list_notes).post(create_note))
        .route(
            "/api/v1/notes/{id}",
            get(get_note).put(update_note).delete(delete_note),
        )
        .route("/api/v1/notes/{id}/star", post(toggle_star))
        .route("/api/v1/notes/{id}/connections", get(note_connections))
        .route("/api/v1/notes/{id}/entities", get(note_entities_list))
        .route("/api/v1/notes/{id}/restore", post(restore_note))
        .route(
            "/api/v1/notes/{id}/permanent",
            axum::routing::delete(permanent_delete_note),
        )
}
