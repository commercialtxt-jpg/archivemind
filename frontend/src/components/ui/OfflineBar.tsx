import { useEffect, useState } from 'react';
import { useOfflineStore } from '../../stores/offlineStore';

/**
 * OfflineBar — shown above the editor content area.
 *
 * States:
 *  - offline   : amber background — "Offline — N changes pending"
 *  - syncing   : coral animated pulse — "Syncing N changes..."
 *  - error     : coral background — "Sync failed — will retry" + retry button
 *  - synced    : sage background — "All changes synced" (auto-hides after 3s)
 *  - hidden    : null (normal online operation with 0 pending changes)
 */
export default function OfflineBar() {
  const { isOffline, syncStatus, pendingChanges, flushPendingChanges } = useOfflineStore();
  const [showSynced, setShowSynced] = useState(false);
  const [prevStatus, setPrevStatus] = useState(syncStatus);

  // Detect transition from syncing → synced to show brief success message
  useEffect(() => {
    if (prevStatus === 'syncing' && syncStatus === 'synced' && !isOffline) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevStatus(syncStatus);
  }, [syncStatus, isOffline, prevStatus]);

  const handleRetry = async () => {
    try {
      await flushPendingChanges();
    } catch {
      // Error will be reflected in syncStatus
    }
  };

  // Offline state
  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 px-4 py-1.5 border-b border-amber/20 text-[12px] font-medium"
        style={{ background: 'rgba(196,132,74,0.10)', color: 'var(--color-amber)' }}
      >
        <span aria-hidden="true">📡</span>
        <span>
          Offline
          {pendingChanges > 0
            ? ` — ${pendingChanges} change${pendingChanges > 1 ? 's' : ''} pending`
            : ' — changes saved locally'}
        </span>
      </div>
    );
  }

  // Syncing state
  if (syncStatus === 'syncing') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 px-4 py-1.5 border-b text-[12px] font-medium overflow-hidden relative"
        style={{
          background: 'rgba(207,106,76,0.08)',
          borderColor: 'rgba(207,106,76,0.2)',
          color: 'var(--color-coral)',
        }}
      >
        {/* Animated progress bar */}
        <div
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left animate-sync-progress"
          style={{ background: 'var(--color-coral)', opacity: 0.6 }}
        />
        <span className="w-2 h-2 rounded-full bg-coral animate-pulse flex-shrink-0" aria-hidden="true" />
        <span>
          {pendingChanges > 0
            ? `Syncing ${pendingChanges} change${pendingChanges > 1 ? 's' : ''}...`
            : 'Syncing...'}
        </span>
      </div>
    );
  }

  // Error state
  if (syncStatus === 'error') {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 px-4 py-1.5 border-b text-[12px] font-medium"
        style={{
          background: 'rgba(207,106,76,0.08)',
          borderColor: 'rgba(207,106,76,0.2)',
          color: 'var(--color-coral)',
        }}
      >
        <span aria-hidden="true">⚠</span>
        <span className="flex-1">
          Sync failed
          {pendingChanges > 0 ? ` — ${pendingChanges} change${pendingChanges > 1 ? 's' : ''} pending` : ''}
        </span>
        <button
          onClick={handleRetry}
          className="text-[11px] underline hover:no-underline cursor-pointer transition-all"
          aria-label="Retry sync"
        >
          Retry
        </button>
      </div>
    );
  }

  // Brief "synced" success state after flush
  if (showSynced) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 px-4 py-1.5 border-b text-[12px] font-medium animate-fade-in"
        style={{
          background: 'rgba(107,140,122,0.08)',
          borderColor: 'rgba(107,140,122,0.2)',
          color: 'var(--color-sage)',
        }}
      >
        <span aria-hidden="true">✓</span>
        <span>All changes synced</span>
      </div>
    );
  }

  return null;
}
