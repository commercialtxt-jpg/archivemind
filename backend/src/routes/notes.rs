use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::note::*;
use crate::response::ApiResponse;

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
    // and bind parameters positionally
    let mut query_str = String::from(
        "SELECT n.id, n.workspace_id, n.title, n.body_text, n.note_type::text, n.is_starred, \
         n.location_name, n.gps_coords, n.weather, n.created_at, n.updated_at \
         FROM notes n",
    );
    let mut count_str = String::from("SELECT COUNT(*) FROM notes n");
    let mut joins = String::new();

    if filters.field_trip_id.is_some() {
        joins.push_str(" JOIN note_field_trips nft ON nft.note_id = n.id");
        conditions.push(format!("nft.field_trip_id = ${}", param_idx));
        param_idx += 1;
    }

    if filters.concept_id.is_some() {
        joins.push_str(" JOIN note_concepts nc ON nc.note_id = n.id");
        conditions.push(format!("nc.concept_id = ${}", param_idx));
        param_idx += 1;
    }

    if filters.entity_id.is_some() {
        joins.push_str(" JOIN note_entities ne ON ne.note_id = n.id");
        conditions.push(format!("ne.entity_id = ${}", param_idx));
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

    query_str.push_str(&joins);
    query_str.push_str(&where_clause);
    query_str.push_str(order);
    query_str.push_str(&format!(" LIMIT ${} OFFSET ${}", param_idx, param_idx + 1));

    count_str.push_str(&joins);
    count_str.push_str(&where_clause);

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
    if body.title.is_empty() {
        return Err(AppError::BadRequest("Title is required".to_string()));
    }

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

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

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

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/notes", get(list_notes).post(create_note))
        .route(
            "/api/v1/notes/{id}",
            get(get_note).put(update_note).delete(delete_note),
        )
        .route("/api/v1/notes/{id}/star", post(toggle_star))
        .route("/api/v1/notes/{id}/connections", get(note_connections))
        .route("/api/v1/notes/{id}/restore", post(restore_note))
        .route(
            "/api/v1/notes/{id}/permanent",
            axum::routing::delete(permanent_delete_note),
        )
}
