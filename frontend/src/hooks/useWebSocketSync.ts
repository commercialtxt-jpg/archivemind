import { useEffect } from 'react';
import { useOfflineStore } from '../stores/offlineStore';

/**
 * Placeholder for WebSocket-based real-time sync.
 *
 * The backend does not yet expose a `/ws/sync` endpoint, so this hook simply
 * sets the sync status to "synced" (the app works fine via REST polling).
 * When WebSocket support is added to the backend, restore the connect logic.
 */
export function useWebSocketSync() {
  const { isOffline, setSyncStatus } = useOfflineStore();

  useEffect(() => {
    setSyncStatus(isOffline ? 'offline' : 'synced');
  }, [isOffline, setSyncStatus]);
}
