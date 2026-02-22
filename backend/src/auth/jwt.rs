use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,
    pub workspace_id: Uuid,
    pub exp: i64,
}

pub fn create_token(
    user_id: Uuid,
    workspace_id: Uuid,
    secret: &str,
    expiry_hours: i64,
) -> Result<String, AppError> {
    let claims = Claims {
        sub: user_id,
        workspace_id,
        exp: Utc::now().timestamp() + (expiry_hours * 3600),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Token creation failed: {}", e)))
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))
}
