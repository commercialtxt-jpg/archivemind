pub mod concepts;
pub mod entities;
pub mod field_trips;
pub mod graph;
pub mod health;
pub mod inventory;
pub mod map;
pub mod media;
pub mod notes;
pub mod routines;
pub mod search;
pub mod settings;
pub mod tags;
pub mod usage;
pub mod users;

use axum::Router;
use sqlx::PgPool;

use crate::config::Config;

pub fn build_router(pool: PgPool, config: Config) -> Router {
    Router::new()
        .merge(health::routes())
        .merge(users::routes())
        .merge(notes::routes())
        .merge(entities::routes())
        .merge(concepts::routes())
        .merge(field_trips::routes())
        .merge(tags::routes())
        .merge(search::routes())
        .merge(media::routes())
        .merge(inventory::routes())
        .merge(routines::routes())
        .merge(graph::routes())
        .merge(map::routes())
        .merge(usage::routes())
        .merge(settings::routes())
        .with_state(pool)
        .layer(axum::Extension(config))
}
