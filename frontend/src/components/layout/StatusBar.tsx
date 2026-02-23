import { useOfflineStore } from '../../stores/offlineStore';
import { useNoteCounts } from '../../hooks/useNotes';
import { useEntities } from '../../hooks/useEntities';
import { getMockEntityCounts } from '../../lib/mockData';

export default function StatusBar() {
  const { syncStatus, lastSyncAt, isOffline } = useOfflineStore();
  const { data: counts } = useNoteCounts();
  const { data: entitiesResp } = useEntities();
  const { data: locationsResp } = useEntities('location');

  const statusColor = syncStatus === 'synced' ? 'bg-sage'
    : syncStatus === 'syncing' ? 'bg-sage animate-pulse-sync'
    : syncStatus === 'offline' ? 'bg-amber'
    : 'bg-coral';

  const statusLabel = isOffline ? 'Offline'
    : syncStatus === 'synced' && lastSyncAt ? `Synced · ${formatRelativeTime(lastSyncAt)}`
    : syncStatus === 'syncing' ? 'Syncing...'
    : 'Synced to Cloud';

  const mockCounts = getMockEntityCounts();
  const noteCount = counts?.total ?? 47;
  const entityCount = entitiesResp?.meta?.total ?? entitiesResp?.data?.length ?? mockCounts.person;
  const locationCount = locationsResp?.meta?.total ?? locationsResp?.data?.length ?? mockCounts.location;

  return (
    <div className="flex items-center h-[26px] px-4 gap-4 bg-sidebar-bg border-t border-border-light text-[11px] text-ink-muted">
      {/* Sync status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        <span>{statusLabel}</span>
      </div>

      {/* GPS indicator */}
      <span>📍 GPS Active</span>

      {/* Counts */}
      <span>{noteCount} Notes · {entityCount} Entities · {locationCount} Locations</span>

      <div className="flex-1" />

      <span className="font-mono text-[11px]">v0.1.0</span>
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
