mod auth;
mod config;
mod error;
pub mod middleware;
mod models;
mod response;
mod routes;
mod seed;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::DefaultBodyLimit;
use axum::http::{header, HeaderValue, StatusCode};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceBuilder;
use tower::timeout::TimeoutLayer;
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_http::cors::{Any, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;

/// Listens for SIGINT (Ctrl-C) and SIGTERM and resolves when either arrives.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, starting graceful shutdown");
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "archivemind_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env();

    // --- 3.1 Connection pool hardening ---
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .test_before_acquire(true)
        .connect(&config.database_url)
        .await;

    let pool = match pool {
        Ok(pool) => pool,
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };

    // Run migrations with structured error handling instead of panic.
    if let Err(e) = sqlx::migrate!("./migrations").run(&pool).await {
        tracing::error!("Failed to run migrations: {}", e);
        std::process::exit(1);
    }

    tracing::info!("Migrations applied successfully");

    // Keep a clone for the graceful-shutdown pool drain (PgPool is Arc-backed).
    let pool_shutdown = pool.clone();

    // Shared HTTP client for outbound AI API calls (avoids re-creating per request)
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .expect("Failed to create HTTP client");

    // --- 3.4 Rate limiting ---
    // 10 requests/second sustained, burst of 30.
    // Uses PeerIpKeyExtractor by default, which requires connect_info.
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(10)
            .burst_size(30)
            .finish()
            .unwrap(),
    );

    let cors_origin = config
        .cors_origin
        .parse::<HeaderValue>()
        .unwrap_or_else(|e| {
            tracing::warn!("Invalid CORS_ORIGIN '{}': {}; defaulting to localhost:5173", config.cors_origin, e);
            HeaderValue::from_static("http://localhost:5173")
        });

    let cors = CorsLayer::new()
        .allow_origin(cors_origin)
        .allow_methods(Any)
        .allow_headers(Any);

    // TimeoutLayer's error type (Box<dyn Error>) is not Into<Infallible>.
    // Wrap it with HandleErrorLayer so the Router keeps its Infallible bound.
    let timeout_layer = ServiceBuilder::new()
        .layer(axum::error_handling::HandleErrorLayer::new(
            |_: axum::BoxError| async move {
                (StatusCode::REQUEST_TIMEOUT, "Request timed out".to_string())
            },
        ))
        .layer(TimeoutLayer::new(std::time::Duration::from_secs(30)));

    // Layer order (bottom-up evaluation): TraceLayer → timeout → governor → cors → correlation_id → security headers → body limit → router
    let app = routes::build_router(pool, config.clone(), http_client)
        // --- Body size limit (50 MB) ---
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024))
        // --- Security response headers ---
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        // --- 3.5 Correlation ID ---
        .layer(axum::middleware::from_fn(
            crate::middleware::correlation_id::correlation_id,
        ))
        .layer(cors)
        // --- 3.4 Rate limiting ---
        .layer(GovernorLayer::new(governor_conf))
        // --- 3.3 Request timeout (30 s) ---
        .layer(timeout_layer)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to bind to {}: {}", addr, e);
            std::process::exit(1);
        });

    // --- 3.2 Graceful shutdown ---
    // GovernorLayer's PeerIpKeyExtractor needs connect_info to read the client IP.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .unwrap();

    tracing::info!("Server shut down gracefully");

    // Drain the pool after the server stops accepting connections.
    pool_shutdown.close().await;
}
