use axum::{
    extract::Request,
    http::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

static X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

pub async fn correlation_id(mut request: Request, next: Next) -> Response {
    let request_id = request
        .headers()
        .get(&X_REQUEST_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    request
        .headers_mut()
        .insert(&X_REQUEST_ID, HeaderValue::from_str(&request_id).unwrap());

    let mut response = next.run(request).await;

    response
        .headers_mut()
        .insert(&X_REQUEST_ID, HeaderValue::from_str(&request_id).unwrap());

    response
}
