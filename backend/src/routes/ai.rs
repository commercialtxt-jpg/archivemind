use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::config::Config;
use crate::error::AppError;
use crate::middleware::plan_guard;
use crate::models::ai;
use crate::response::ApiResponse;

// ---------------------------------------------------------------------------
// Request / response DTOs
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SummarizeRequest {
    pub note_id: Uuid,
}

#[derive(Serialize)]
pub struct SummarizeResponse {
    pub summary: String,
    pub coming_soon: bool,
    pub model: String,
}

#[derive(Deserialize)]
pub struct ChatRequest {
    pub conversation_id: Option<Uuid>,
    pub note_id: Option<Uuid>,
    pub message: String,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub conversation_id: Uuid,
    pub message: ai::AiMessage,
    pub coming_soon: bool,
}

#[derive(Deserialize)]
pub struct CompleteRequest {
    pub note_id: Option<Uuid>,
    pub text: String,
}

#[derive(Serialize)]
pub struct CompleteResponse {
    pub completion: String,
    pub coming_soon: bool,
}

#[derive(Deserialize)]
pub struct ConversationsQuery {
    pub note_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct ConversationWithMessages {
    #[serde(flatten)]
    pub conversation: ai::AiConversation,
    pub messages: Vec<ai::AiMessage>,
}

#[derive(Serialize)]
pub struct AiStatusResponse {
    pub enabled: bool,
    pub provider: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct SuggestedTag {
    pub id: Uuid,
    pub name: String,
    pub tag_type: String, // "entity" or "concept"
    pub entity_type: Option<String>,
    pub score: f64,
}

#[derive(Serialize)]
pub struct RelatedNote {
    pub id: Uuid,
    pub title: String,
    pub note_type: String,
    pub body_text: String,
    pub shared_entities: i64,
    pub shared_concepts: i64,
    pub relevance_score: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct TimelineEntry {
    pub id: Uuid,
    pub title: String,
    pub note_type: String,
    pub location_name: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub entity_count: i64,
    pub concept_count: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct TimelineQuery {
    pub field_trip_id: Option<Uuid>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct SuggestTagsRequest {
    pub note_id: Uuid,
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/v1/ai/status", get(ai_status))
        .route("/api/v1/ai/summarize", post(summarize))
        .route("/api/v1/ai/chat", post(chat))
        .route("/api/v1/ai/complete", post(complete))
        .route("/api/v1/ai/suggest-tags", post(suggest_tags))
        .route("/api/v1/ai/related-notes/{note_id}", get(related_notes))
        .route("/api/v1/ai/timeline", get(timeline))
        .route("/api/v1/ai/conversations", get(list_conversations))
        .route("/api/v1/ai/conversations/{id}", get(get_conversation))
        .route("/api/v1/ai/conversations/{id}", delete(delete_conversation))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct NoteContent {
    title: String,
    body_text: String,
}

/// Determine which AI provider to use. Returns ("claude", key) or ("perplexity", key) or ("none", "").
fn resolve_provider(config: &Config) -> (&'static str, &str) {
    if !config.anthropic_api_key.is_empty() {
        ("claude", &config.anthropic_api_key)
    } else if !config.perplexity_api_key.is_empty() {
        ("perplexity", &config.perplexity_api_key)
    } else {
        ("none", "")
    }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async fn ai_status(
    axum::Extension(config): axum::Extension<Config>,
) -> Json<AiStatusResponse> {
    let (provider, _) = resolve_provider(&config);
    let enabled = provider != "none";
    Json(AiStatusResponse {
        enabled,
        provider: provider.to_string(),
        message: match provider {
            "claude" => "AI features powered by Claude are available.".to_string(),
            "perplexity" => "AI features powered by Perplexity are available.".to_string(),
            _ => "AI features are coming soon. Stay tuned!".to_string(),
        },
    })
}

async fn summarize(
    auth: AuthUser,
    State(pool): State<PgPool>,
    axum::Extension(config): axum::Extension<Config>,
    Json(body): Json<SummarizeRequest>,
) -> Result<Json<ApiResponse<SummarizeResponse>>, AppError> {
    plan_guard::check_limit(&pool, auth.user_id, auth.workspace_id, "ai_requests").await?;

    let (provider, api_key) = resolve_provider(&config);

    if provider == "none" {
        return Ok(ApiResponse::ok(SummarizeResponse {
            summary: "AI-powered summarization is coming soon! This feature will use AI to generate concise summaries of your field notes, highlighting key entities, locations, and concepts.".to_string(),
            coming_soon: true,
            model: "none".to_string(),
        }));
    }

    let note = sqlx::query_as::<_, NoteContent>(
        "SELECT title, body_text FROM notes WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
    )
    .bind(body.note_id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Note not found".to_string()))?;

    let system_prompt = "You are a field research assistant for ArchiveMind. Summarize the following field note concisely. Highlight key entities, locations, and concepts mentioned. Use bullet points.";
    let note_content = format!("Title: {}\n\n{}", note.title, note.body_text);
    let truncated = truncate_text(&note_content, 12000);

    let (summary, model) = match provider {
        "claude" => {
            let text = call_claude(api_key, system_prompt, &truncated, 1024).await?;
            (text, "claude-sonnet-4-6".to_string())
        }
        _ => {
            let text = call_perplexity(api_key, "sonar", system_prompt, &truncated).await?;
            (text, "sonar".to_string())
        }
    };

    plan_guard::increment_usage(&pool, auth.user_id, auth.workspace_id, "ai_requests", 1).await?;

    Ok(ApiResponse::ok(SummarizeResponse {
        summary,
        coming_soon: false,
        model,
    }))
}

async fn chat(
    auth: AuthUser,
    State(pool): State<PgPool>,
    axum::Extension(config): axum::Extension<Config>,
    Json(body): Json<ChatRequest>,
) -> Result<Json<ApiResponse<ChatResponse>>, AppError> {
    plan_guard::check_limit(&pool, auth.user_id, auth.workspace_id, "ai_requests").await?;

    let conversation = if let Some(conv_id) = body.conversation_id {
        ai::get_conversation(&pool, auth.workspace_id, conv_id).await?
    } else {
        let title = if body.message.len() > 60 {
            format!("{}...", &body.message[..57])
        } else {
            body.message.clone()
        };
        ai::create_conversation(&pool, auth.workspace_id, body.note_id, &title).await?
    };

    ai::insert_message(&pool, conversation.id, "user", &body.message, None, None).await?;

    let (provider, api_key) = resolve_provider(&config);

    if provider == "none" {
        let assistant_msg = ai::insert_message(
            &pool,
            conversation.id,
            "assistant",
            "AI-powered research chat is coming soon! This feature will help you analyze your notes, discover connections, and find related academic sources.",
            None,
            Some("coming-soon"),
        )
        .await?;

        return Ok(ApiResponse::ok(ChatResponse {
            conversation_id: conversation.id,
            message: assistant_msg,
            coming_soon: true,
        }));
    }

    let history = ai::get_messages(&pool, conversation.id).await?;

    let note_context = if let Some(note_id) = conversation.note_id {
        sqlx::query_as::<_, NoteContent>(
            "SELECT title, body_text FROM notes WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
        )
        .bind(note_id)
        .bind(auth.workspace_id)
        .fetch_optional(&pool)
        .await?
    } else {
        None
    };

    let system_prompt = "You are a field research assistant for ArchiveMind. Help the researcher analyze their notes, discover connections, and find related academic sources. When citing web sources, include URLs.";

    let (response_text, model_name) = match provider {
        "claude" => {
            let text = call_claude_chat(api_key, system_prompt, &history, note_context.as_ref()).await?;
            (text, "claude-sonnet-4-6")
        }
        _ => {
            let text = call_perplexity_chat(api_key, system_prompt, &history, note_context.as_ref()).await?;
            (text, "sonar-pro")
        }
    };

    let assistant_msg = ai::insert_message(
        &pool,
        conversation.id,
        "assistant",
        &response_text,
        None,
        Some(model_name),
    )
    .await?;

    plan_guard::increment_usage(&pool, auth.user_id, auth.workspace_id, "ai_requests", 1).await?;

    Ok(ApiResponse::ok(ChatResponse {
        conversation_id: conversation.id,
        message: assistant_msg,
        coming_soon: false,
    }))
}

async fn complete(
    auth: AuthUser,
    State(pool): State<PgPool>,
    axum::Extension(config): axum::Extension<Config>,
    Json(body): Json<CompleteRequest>,
) -> Result<Json<ApiResponse<CompleteResponse>>, AppError> {
    plan_guard::check_limit(&pool, auth.user_id, auth.workspace_id, "ai_requests").await?;

    let (provider, api_key) = resolve_provider(&config);

    if provider == "none" {
        return Ok(ApiResponse::ok(CompleteResponse {
            completion: String::new(),
            coming_soon: true,
        }));
    }

    // Optionally fetch note context for better completions
    let note_context = if let Some(note_id) = body.note_id {
        sqlx::query_as::<_, NoteContent>(
            "SELECT title, body_text FROM notes WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
        )
        .bind(note_id)
        .bind(auth.workspace_id)
        .fetch_optional(&pool)
        .await?
    } else {
        None
    };

    let system_prompt = if let Some(ref note) = note_context {
        format!(
            "You are a writing assistant for a field researcher using ArchiveMind. \
             The researcher is writing a note titled \"{}\". \
             Continue the text naturally. Write 1-2 sentences that flow from the given text. \
             Match the researcher's style and tone. Do NOT repeat the given text. \
             Only output the continuation, nothing else.",
            note.title
        )
    } else {
        "You are a writing assistant for a field researcher. \
         Continue the text naturally. Write 1-2 sentences that flow from the given text. \
         Only output the continuation, nothing else.".to_string()
    };

    let text_to_complete = truncate_text(&body.text, 4000);

    let completion = match provider {
        "claude" => call_claude(api_key, &system_prompt, &text_to_complete, 200).await?,
        _ => call_perplexity(api_key, "sonar", &system_prompt, &text_to_complete).await?,
    };

    plan_guard::increment_usage(&pool, auth.user_id, auth.workspace_id, "ai_requests", 1).await?;

    Ok(ApiResponse::ok(CompleteResponse {
        completion,
        coming_soon: false,
    }))
}

// ---------------------------------------------------------------------------
// Local intelligence (no AI, pure DB)
// ---------------------------------------------------------------------------

async fn suggest_tags(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Json(body): Json<SuggestTagsRequest>,
) -> Result<Json<ApiResponse<Vec<SuggestedTag>>>, AppError> {
    // Get note text
    let note = sqlx::query_as::<_, NoteContent>(
        "SELECT title, body_text FROM notes WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
    )
    .bind(body.note_id)
    .bind(auth.workspace_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Note not found".to_string()))?;

    let text = format!("{} {}", note.title, note.body_text).to_lowercase();

    // Find entities whose name appears in the note text but aren't already linked
    let entity_suggestions = sqlx::query_as::<_, EntitySuggestion>(
        "SELECT e.id, e.name, e.entity_type::text as entity_type \
         FROM entities e \
         WHERE e.workspace_id = $1 \
           AND LOWER(e.name) != '' \
           AND e.id NOT IN (SELECT entity_id FROM note_entities WHERE note_id = $2) \
         ORDER BY LENGTH(e.name) DESC",
    )
    .bind(auth.workspace_id)
    .bind(body.note_id)
    .fetch_all(&pool)
    .await?;

    // Find concepts whose name appears in the note text but aren't already linked
    let concept_suggestions = sqlx::query_as::<_, ConceptSuggestion>(
        "SELECT c.id, c.name \
         FROM concepts c \
         WHERE c.workspace_id = $1 \
           AND LOWER(c.name) != '' \
           AND c.id NOT IN (SELECT concept_id FROM note_concepts WHERE note_id = $2) \
         ORDER BY LENGTH(c.name) DESC",
    )
    .bind(auth.workspace_id)
    .bind(body.note_id)
    .fetch_all(&pool)
    .await?;

    let mut suggestions: Vec<SuggestedTag> = Vec::new();

    for entity in entity_suggestions {
        let name_lower = entity.name.to_lowercase();
        if text.contains(&name_lower) {
            // Score based on frequency of occurrence
            let count = text.matches(&name_lower).count() as f64;
            suggestions.push(SuggestedTag {
                id: entity.id,
                name: entity.name,
                tag_type: "entity".to_string(),
                entity_type: Some(entity.entity_type),
                score: count * name_lower.len() as f64,
            });
        }
    }

    for concept in concept_suggestions {
        let name_lower = concept.name.to_lowercase();
        if text.contains(&name_lower) {
            let count = text.matches(&name_lower).count() as f64;
            suggestions.push(SuggestedTag {
                id: concept.id,
                name: concept.name,
                tag_type: "concept".to_string(),
                entity_type: None,
                score: count * name_lower.len() as f64,
            });
        }
    }

    // Sort by score descending
    suggestions.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    suggestions.truncate(10);

    Ok(ApiResponse::ok(suggestions))
}

async fn related_notes(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(note_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<RelatedNote>>>, AppError> {
    // Find notes that share entities or concepts with the given note
    let related = sqlx::query_as::<_, RelatedNoteRow>(
        "WITH note_ents AS (
            SELECT entity_id FROM note_entities WHERE note_id = $1
         ),
         note_cons AS (
            SELECT concept_id FROM note_concepts WHERE note_id = $1
         ),
         shared AS (
            SELECT n.id,
                   n.title,
                   n.note_type::text as note_type,
                   SUBSTRING(n.body_text FROM 1 FOR 200) as body_text,
                   n.created_at,
                   COUNT(DISTINCT ne.entity_id) FILTER (WHERE ne.entity_id IN (SELECT entity_id FROM note_ents)) as shared_entities,
                   COUNT(DISTINCT nc.concept_id) FILTER (WHERE nc.concept_id IN (SELECT concept_id FROM note_cons)) as shared_concepts
            FROM notes n
            LEFT JOIN note_entities ne ON ne.note_id = n.id
            LEFT JOIN note_concepts nc ON nc.note_id = n.id
            WHERE n.workspace_id = $2
              AND n.id != $1
              AND n.deleted_at IS NULL
            GROUP BY n.id, n.title, n.note_type, n.body_text, n.created_at
         )
         SELECT id, title, note_type, body_text, created_at, shared_entities, shared_concepts,
                (shared_entities * 3 + shared_concepts * 2)::FLOAT8 as relevance_score
         FROM shared
         WHERE shared_entities > 0 OR shared_concepts > 0
         ORDER BY relevance_score DESC, created_at DESC
         LIMIT 10",
    )
    .bind(note_id)
    .bind(auth.workspace_id)
    .fetch_all(&pool)
    .await?;

    let results: Vec<RelatedNote> = related
        .into_iter()
        .map(|r| RelatedNote {
            id: r.id,
            title: r.title,
            note_type: r.note_type,
            body_text: r.body_text,
            shared_entities: r.shared_entities,
            shared_concepts: r.shared_concepts,
            relevance_score: r.relevance_score,
            created_at: r.created_at,
        })
        .collect();

    Ok(ApiResponse::ok(results))
}

async fn timeline(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Query(params): Query<TimelineQuery>,
) -> Result<Json<ApiResponse<Vec<TimelineEntry>>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);

    let entries = if let Some(ft_id) = params.field_trip_id {
        sqlx::query_as::<_, TimelineRow>(
            "SELECT n.id, n.title, n.note_type::text as note_type, \
                    n.location_name, n.location_lat, n.location_lng, n.created_at, \
                    (SELECT COUNT(*) FROM note_entities ne WHERE ne.note_id = n.id) as entity_count, \
                    (SELECT COUNT(*) FROM note_concepts nc WHERE nc.note_id = n.id) as concept_count \
             FROM notes n \
             JOIN note_field_trips nft ON nft.note_id = n.id AND nft.field_trip_id = $3 \
             WHERE n.workspace_id = $1 AND n.deleted_at IS NULL \
             ORDER BY n.created_at ASC \
             LIMIT $2",
        )
        .bind(auth.workspace_id)
        .bind(limit)
        .bind(ft_id)
        .fetch_all(&pool)
        .await?
    } else {
        sqlx::query_as::<_, TimelineRow>(
            "SELECT n.id, n.title, n.note_type::text as note_type, \
                    n.location_name, n.location_lat, n.location_lng, n.created_at, \
                    (SELECT COUNT(*) FROM note_entities ne WHERE ne.note_id = n.id) as entity_count, \
                    (SELECT COUNT(*) FROM note_concepts nc WHERE nc.note_id = n.id) as concept_count \
             FROM notes n \
             WHERE n.workspace_id = $1 AND n.deleted_at IS NULL \
             ORDER BY n.created_at ASC \
             LIMIT $2",
        )
        .bind(auth.workspace_id)
        .bind(limit)
        .fetch_all(&pool)
        .await?
    };

    let results: Vec<TimelineEntry> = entries
        .into_iter()
        .map(|e| TimelineEntry {
            id: e.id,
            title: e.title,
            note_type: e.note_type,
            location_name: e.location_name,
            location_lat: e.location_lat,
            location_lng: e.location_lng,
            entity_count: e.entity_count,
            concept_count: e.concept_count,
            created_at: e.created_at,
        })
        .collect();

    Ok(ApiResponse::ok(results))
}

async fn list_conversations(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Query(params): Query<ConversationsQuery>,
) -> Result<Json<ApiResponse<Vec<ai::AiConversation>>>, AppError> {
    let convs = ai::list_conversations(&pool, auth.workspace_id, params.note_id).await?;
    Ok(ApiResponse::ok(convs))
}

async fn get_conversation(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<ConversationWithMessages>>, AppError> {
    let conversation = ai::get_conversation(&pool, auth.workspace_id, id).await?;
    let messages = ai::get_messages(&pool, id).await?;
    Ok(ApiResponse::ok(ConversationWithMessages {
        conversation,
        messages,
    }))
}

async fn delete_conversation(
    auth: AuthUser,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    ai::delete_conversation(&pool, auth.workspace_id, id).await?;
    Ok(ApiResponse::ok(()))
}

// ---------------------------------------------------------------------------
// SQL row types
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct EntitySuggestion {
    id: Uuid,
    name: String,
    entity_type: String,
}

#[derive(sqlx::FromRow)]
struct ConceptSuggestion {
    id: Uuid,
    name: String,
}

#[derive(sqlx::FromRow)]
struct RelatedNoteRow {
    id: Uuid,
    title: String,
    note_type: String,
    body_text: String,
    shared_entities: i64,
    shared_concepts: i64,
    relevance_score: f64,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(sqlx::FromRow)]
struct TimelineRow {
    id: Uuid,
    title: String,
    note_type: String,
    location_name: Option<String>,
    location_lat: Option<f64>,
    location_lng: Option<f64>,
    entity_count: i64,
    concept_count: i64,
    created_at: chrono::DateTime<chrono::Utc>,
}

// ---------------------------------------------------------------------------
// Claude (Anthropic Messages API)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<ClaudeMessage>,
}

#[derive(Serialize, Deserialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
}

#[derive(Deserialize)]
struct ClaudeContent {
    text: String,
}

async fn call_claude(
    api_key: &str,
    system: &str,
    user_message: &str,
    max_tokens: u32,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let request = ClaudeRequest {
        model: "claude-sonnet-4-6".to_string(),
        max_tokens,
        system: system.to_string(),
        messages: vec![ClaudeMessage {
            role: "user".to_string(),
            content: user_message.to_string(),
        }],
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Claude API error: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Claude API returned {}: {}",
            status, text
        )));
    }

    let parsed: ClaudeResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse Claude response: {}", e)))?;

    parsed
        .content
        .first()
        .map(|c| c.text.clone())
        .ok_or_else(|| AppError::Internal("Empty response from Claude".to_string()))
}

async fn call_claude_chat(
    api_key: &str,
    system_prompt: &str,
    history: &[ai::AiMessage],
    note_context: Option<&NoteContent>,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let system = if let Some(note) = note_context {
        format!(
            "{}\n\nThe researcher is working on a note titled \"{}\". Here is the content:\n\n{}",
            system_prompt,
            note.title,
            truncate_text(&note.body_text, 8000)
        )
    } else {
        system_prompt.to_string()
    };

    let mut messages: Vec<ClaudeMessage> = Vec::new();
    for msg in history {
        if msg.role == "system" {
            continue;
        }
        messages.push(ClaudeMessage {
            role: msg.role.clone(),
            content: msg.content.clone(),
        });
    }

    let request = ClaudeRequest {
        model: "claude-sonnet-4-6".to_string(),
        max_tokens: 2048,
        system,
        messages,
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Claude API error: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Claude API returned {}: {}",
            status, text
        )));
    }

    let parsed: ClaudeResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse Claude response: {}", e)))?;

    parsed
        .content
        .first()
        .map(|c| c.text.clone())
        .ok_or_else(|| AppError::Internal("Empty response from Claude".to_string()))
}

// ---------------------------------------------------------------------------
// Perplexity API (fallback / web search)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct PerplexityRequest {
    model: String,
    messages: Vec<PerplexityMessage>,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
struct PerplexityMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct PerplexityResponse {
    choices: Vec<PerplexityChoice>,
}

#[derive(Deserialize)]
struct PerplexityChoice {
    message: PerplexityChoiceMessage,
}

#[derive(Deserialize)]
struct PerplexityChoiceMessage {
    content: String,
}

async fn call_perplexity(
    api_key: &str,
    model: &str,
    system: &str,
    user_message: &str,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let request = PerplexityRequest {
        model: model.to_string(),
        messages: vec![
            PerplexityMessage {
                role: "system".to_string(),
                content: system.to_string(),
            },
            PerplexityMessage {
                role: "user".to_string(),
                content: user_message.to_string(),
            },
        ],
        stream: false,
    };

    let response = client
        .post("https://api.perplexity.ai/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Perplexity API error: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Perplexity API returned {}: {}",
            status, text
        )));
    }

    let parsed: PerplexityResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse Perplexity response: {}", e)))?;

    parsed
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| AppError::Internal("Empty response from Perplexity".to_string()))
}

async fn call_perplexity_chat(
    api_key: &str,
    system_prompt: &str,
    history: &[ai::AiMessage],
    note_context: Option<&NoteContent>,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let mut messages = vec![PerplexityMessage {
        role: "system".to_string(),
        content: system_prompt.to_string(),
    }];

    if let Some(note) = note_context {
        messages.push(PerplexityMessage {
            role: "system".to_string(),
            content: format!(
                "The researcher is working on a note titled \"{}\". Here is the content:\n\n{}",
                note.title,
                truncate_text(&note.body_text, 8000)
            ),
        });
    }

    for msg in history {
        if msg.role == "system" {
            continue;
        }
        messages.push(PerplexityMessage {
            role: msg.role.clone(),
            content: msg.content.clone(),
        });
    }

    let request = PerplexityRequest {
        model: "sonar-pro".to_string(),
        messages,
        stream: false,
    };

    let response = client
        .post("https://api.perplexity.ai/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Perplexity API error: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Perplexity API returned {}: {}",
            status, text
        )));
    }

    let parsed: PerplexityResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse Perplexity response: {}", e)))?;

    parsed
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| AppError::Internal("Empty response from Perplexity".to_string()))
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

fn truncate_text(text: &str, max_len: usize) -> String {
    if text.len() > max_len {
        format!("{}...", &text[..max_len])
    } else {
        text.to_string()
    }
}
