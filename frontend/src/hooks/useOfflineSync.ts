/**
 * useOfflineSync.ts
 * Listens for browser online/offline events and:
 * 1. Updates offlineStore.isOffline accordingly.
 * 2. Flushes pending changes when coming back online.
 * 3. Syncs the pending-change count from IndexedDB on mount.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStore } from '../stores/offlineStore';

export function useOfflineSync() {
  const { setOffline, flushPendingChanges, syncPendingCount } = useOfflineStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Sync count from IndexedDB on app start
    syncPendingCount().catch(() => {});

    const handleOnline = async () => {
      setOffline(false);
      try {
        const flushed = await flushPendingChanges();
        if (flushed > 0) {
          // Re-fetch server data after flushing queued mutations
          await queryClient.invalidateQueries({ queryKey: ['notes'] });
          await queryClient.invalidateQueries({ queryKey: ['entities'] });
        }
      } catch (err) {
        console.warn('[useOfflineSync] Error flushing pending changes:', err);
      }
    };

    const handleOffline = () => {
      setOffline(true);
    };

    // Reflect current browser status immediately
    if (!navigator.onLine) {
      setOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
