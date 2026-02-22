import { useOfflineStore } from '../../stores/offlineStore';

export default function SyncStatus() {
  const { syncStatus, lastSyncAt, isOffline, setOffline } = useOfflineStore();

  const dotColor = syncStatus === 'synced' ? 'bg-sage'
    : syncStatus === 'syncing' ? 'bg-sage'
    : syncStatus === 'offline' ? 'bg-amber'
    : 'bg-coral';

  const isPulsing = syncStatus === 'syncing';

  const statusText = syncStatus === 'synced' && lastSyncAt
    ? `Synced · ${formatRelativeTime(lastSyncAt)}`
    : syncStatus === 'syncing' ? 'Syncing...'
    : syncStatus === 'offline' ? 'Offline · Local cache'
    : 'Synced';

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <button
        onClick={() => setOffline(!isOffline)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-[7px] hover:bg-white/50 transition-all w-full cursor-pointer"
      >
        <span
          className={`w-[7px] h-[7px] rounded-full ${dotColor} ${isPulsing ? 'animate-pulse-sync' : ''}`}
        />
        <span className="text-[11.5px] text-ink-muted">{statusText}</span>
      </button>
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
