import { useOfflineStore } from '../../stores/offlineStore';

export default function OfflineBar() {
  const isOffline = useOfflineStore((s) => s.isOffline);

  if (!isOffline) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber/10 border-b border-amber/20 text-[12px] text-amber font-medium">
      <span>📡</span>
      <span>Offline mode — changes saved locally</span>
    </div>
  );
}
