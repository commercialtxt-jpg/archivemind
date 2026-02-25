use axum::{extract::State, routing::get, Json, Router};
use sqlx::PgPool;

use crate::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::models::tag::*;
use crate::response::ApiResponse;

async fn list_tags(
    auth: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<TagWithCount>>>, AppError> {
    let tags = sqlx::query_as::<_, TagWithCount>(
        "SELECT t.id, t.name, COUNT(nt.note_id) AS note_count \
         FROM tags t \
         LEFT JOIN note_tags nt ON nt.tag_id = t.id \
         WHERE t.workspace_id = $1 \
         GROUP BY t.id \
         ORDER BY t.name ASC",
    )
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let total = tags.len() as i64;
    Ok(ApiResponse::list(tags, total, 1, total.max(1)))
}

pub fn routes() -> Router<PgPool> {
    Router::new().route("/api/v1/tags", get(list_tags))
}
