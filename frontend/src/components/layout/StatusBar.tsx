import { useOfflineStore } from '../../stores/offlineStore';
import { useNoteCounts } from '../../hooks/useNotes';
import { useEntities } from '../../hooks/useEntities';

export default function StatusBar() {
  const { syncStatus, lastSyncAt, isOffline, pendingChanges } = useOfflineStore();
  const { data: counts } = useNoteCounts();
  const { data: entitiesResp } = useEntities();

  // Sync dot color
  const statusColor =
    isOffline ? 'bg-amber' :
    syncStatus === 'syncing' ? 'bg-coral' :
    syncStatus === 'error' ? 'bg-coral' :
    'bg-sage';

  const isPulsing = syncStatus === 'syncing';

  // Sync label
  const statusLabel =
    isOffline
      ? pendingChanges > 0
        ? `Offline · ${pendingChanges} pending`
        : 'Offline'
      : syncStatus === 'syncing'
        ? pendingChanges > 0
          ? `Syncing ${pendingChanges} change${pendingChanges > 1 ? 's' : ''}...`
          : 'Syncing...'
        : syncStatus === 'error'
          ? 'Sync error'
          : lastSyncAt
            ? `Synced · ${formatRelativeTime(lastSyncAt)}`
            : 'Synced';

  const noteCount = counts?.total ?? 0;
  const entityCount = entitiesResp?.meta?.total ?? entitiesResp?.data?.length ?? 0;

  return (
    <div
      className="flex items-center h-[26px] px-4 gap-4 border-t text-[11px]"
      style={{
        background: 'var(--color-sidebar-bg)',
        borderColor: 'var(--color-border-light)',
        color: 'var(--color-ink-muted)',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Sync status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor} ${isPulsing ? 'animate-pulse-sync' : ''}`}
          aria-hidden="true"
        />
        <span>{statusLabel}</span>
      </div>

      {/* GPS indicator */}
      <span aria-label="GPS active">
        <span aria-hidden="true">📍</span> GPS Active
      </span>

      {/* Counts */}
      <span>
        {noteCount} Note{noteCount !== 1 ? 's' : ''}
        {' · '}
        {entityCount} Entit{entityCount !== 1 ? 'ies' : 'y'}
      </span>

      <div className="flex-1" />

      <span
        className="font-mono text-[10px]"
        style={{ color: 'var(--color-ink-ghost)' }}
      >
        v0.1.0
      </span>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
