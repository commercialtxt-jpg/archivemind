use sqlx::PgPool;
use uuid::Uuid;

/// Seeds a fresh demo workspace for a newly registered user.
/// Currently a no-op — the app starts empty. Re-enable by restoring the
/// implementation from git history if demo data is needed again.
pub async fn seed_demo_workspace(
    _pool: &PgPool,
    _user_id: Uuid,
    _workspace_id: Uuid,
) -> Result<(), sqlx::Error> {
    Ok(())
}
