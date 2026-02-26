use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: i64,
    pub cors_origin: String,
    pub port: u16,
    pub mapbox_monthly_cap: i64,
    pub lemonsqueezy_webhook_secret: String,
    pub lemonsqueezy_api_key: String,
    pub perplexity_api_key: String,
    pub anthropic_api_key: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "72".to_string())
                .parse()
                .expect("JWT_EXPIRY_HOURS must be a number"),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("PORT must be a number"),
            mapbox_monthly_cap: env::var("MAPBOX_MONTHLY_CAP")
                .unwrap_or_else(|_| "50000".to_string())
                .parse()
                .expect("MAPBOX_MONTHLY_CAP must be a number"),
            lemonsqueezy_webhook_secret: env::var("LEMONSQUEEZY_WEBHOOK_SECRET")
                .unwrap_or_else(|_| String::new()),
            lemonsqueezy_api_key: env::var("LEMONSQUEEZY_API_KEY")
                .unwrap_or_else(|_| String::new()),
            perplexity_api_key: env::var("PERPLEXITY_API_KEY")
                .unwrap_or_else(|_| String::new()),
            anthropic_api_key: env::var("ANTHROPIC_API_KEY")
                .unwrap_or_else(|_| String::new()),
        }
    }
}
