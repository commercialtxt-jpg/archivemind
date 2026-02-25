use axum::{extract::FromRequestParts, http::request::Parts};
use uuid::Uuid;

use crate::auth::jwt::{verify_token, Claims};
use crate::config::Config;
use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub workspace_id: Uuid,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let config = parts
            .extensions
            .get::<Config>()
            .ok_or_else(|| AppError::Internal("Config not found in extensions".to_string()))?;

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Invalid authorization format".to_string()))?;

        let Claims {
            sub, workspace_id, ..
        } = verify_token(token, &config.jwt_secret)?;

        Ok(AuthUser {
            user_id: sub,
            workspace_id,
        })
    }
}
