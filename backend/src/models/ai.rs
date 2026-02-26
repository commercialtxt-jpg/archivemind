use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AiConversation {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub note_id: Option<Uuid>,
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AiMessage {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub role: String,
    pub content: String,
    pub citations: Option<serde_json::Value>,
    pub model: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

pub async fn create_conversation(
    pool: &PgPool,
    workspace_id: Uuid,
    note_id: Option<Uuid>,
    title: &str,
) -> Result<AiConversation, AppError> {
    let conv = sqlx::query_as::<_, AiConversation>(
        "INSERT INTO ai_conversations (workspace_id, note_id, title) \
         VALUES ($1, $2, $3) RETURNING *",
    )
    .bind(workspace_id)
    .bind(note_id)
    .bind(title)
    .fetch_one(pool)
    .await?;
    Ok(conv)
}

pub async fn list_conversations(
    pool: &PgPool,
    workspace_id: Uuid,
    note_id: Option<Uuid>,
) -> Result<Vec<AiConversation>, AppError> {
    let convs = if let Some(nid) = note_id {
        sqlx::query_as::<_, AiConversation>(
            "SELECT * FROM ai_conversations \
             WHERE workspace_id = $1 AND note_id = $2 \
             ORDER BY updated_at DESC",
        )
        .bind(workspace_id)
        .bind(nid)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, AiConversation>(
            "SELECT * FROM ai_conversations \
             WHERE workspace_id = $1 \
             ORDER BY updated_at DESC",
        )
        .bind(workspace_id)
        .fetch_all(pool)
        .await?
    };
    Ok(convs)
}

pub async fn get_conversation(
    pool: &PgPool,
    workspace_id: Uuid,
    conversation_id: Uuid,
) -> Result<AiConversation, AppError> {
    let conv = sqlx::query_as::<_, AiConversation>(
        "SELECT * FROM ai_conversations WHERE id = $1 AND workspace_id = $2",
    )
    .bind(conversation_id)
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;
    Ok(conv)
}

pub async fn get_messages(
    pool: &PgPool,
    conversation_id: Uuid,
) -> Result<Vec<AiMessage>, AppError> {
    let msgs = sqlx::query_as::<_, AiMessage>(
        "SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await?;
    Ok(msgs)
}

pub async fn insert_message(
    pool: &PgPool,
    conversation_id: Uuid,
    role: &str,
    content: &str,
    citations: Option<serde_json::Value>,
    model: Option<&str>,
) -> Result<AiMessage, AppError> {
    let msg = sqlx::query_as::<_, AiMessage>(
        "INSERT INTO ai_messages (conversation_id, role, content, citations, model) \
         VALUES ($1, $2, $3, $4, $5) RETURNING *",
    )
    .bind(conversation_id)
    .bind(role)
    .bind(content)
    .bind(citations)
    .bind(model)
    .fetch_one(pool)
    .await?;

    // Touch conversation updated_at
    sqlx::query("UPDATE ai_conversations SET updated_at = now() WHERE id = $1")
        .bind(conversation_id)
        .execute(pool)
        .await?;

    Ok(msg)
}

pub async fn delete_conversation(
    pool: &PgPool,
    workspace_id: Uuid,
    conversation_id: Uuid,
) -> Result<(), AppError> {
    let result = sqlx::query(
        "DELETE FROM ai_conversations WHERE id = $1 AND workspace_id = $2",
    )
    .bind(conversation_id)
    .bind(workspace_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Conversation not found".to_string()));
    }
    Ok(())
}
