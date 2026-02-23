import { create } from 'zustand';
import {
  enqueuePendingChange,
  getPendingChanges,
  removePendingChange,
  countPendingChanges,
  type PendingChange,
} from '../lib/offlineDb';
import api from '../lib/api';

interface OfflineState {
  isOffline: boolean;
  lastSyncAt: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  pendingChanges: number;

  // WebSocket connection reference (not serialized)
  _ws: WebSocket | null;

  setOffline: (offline: boolean) => void;
  setLastSyncAt: (time: string) => void;
  setSyncStatus: (status: OfflineState['syncStatus']) => void;
  setPendingChanges: (count: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  setWs: (ws: WebSocket | null) => void;

  /**
   * Enqueue a mutation to be replayed when the user comes back online.
   * Also increments the pendingChanges counter.
   */
  queueChange: (change: Omit<PendingChange, 'createdAt'>) => Promise<void>;

  /**
   * Replay all queued pending changes against the API in creation order.
   * Called automatically when the network comes back online.
   * Returns the number of changes that were successfully flushed.
   */
  flushPendingChanges: () => Promise<number>;

  /** Sync pendingChanges counter from IndexedDB (e.g. on app init). */
  syncPendingCount: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: false,
  lastSyncAt: null,
  syncStatus: 'synced',
  pendingChanges: 0,
  _ws: null,

  setOffline: (offline) =>
    set({ isOffline: offline, syncStatus: offline ? 'offline' : 'synced' }),
  setLastSyncAt: (time) => set({ lastSyncAt: time }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setPendingChanges: (count) => set({ pendingChanges: count }),
  incrementPending: () => set((s) => ({ pendingChanges: s.pendingChanges + 1 })),
  decrementPending: () =>
    set((s) => ({ pendingChanges: Math.max(0, s.pendingChanges - 1) })),
  setWs: (ws) => set({ _ws: ws }),

  queueChange: async (change) => {
    const full: PendingChange = {
      ...change,
      createdAt: new Date().toISOString(),
    };
    await enqueuePendingChange(full);
    const count = await countPendingChanges();
    set({ pendingChanges: count });
  },

  flushPendingChanges: async () => {
    const changes = await getPendingChanges();
    if (changes.length === 0) return 0;

    set({ syncStatus: 'syncing' });
    let flushed = 0;

    for (const change of changes) {
      try {
        if (change.method === 'POST') {
          await api.post(change.url, change.body);
        } else if (change.method === 'PUT') {
          await api.put(change.url, change.body);
        } else if (change.method === 'DELETE') {
          await api.delete(change.url);
        }
        await removePendingChange(change.id);
        flushed++;
      } catch (err) {
        // Stop on first error; changes remain queued for next flush attempt
        console.warn('[offlineStore] Failed to flush change:', change.url, err);
        break;
      }
    }

    const remaining = await countPendingChanges();
    set({
      pendingChanges: remaining,
      syncStatus: remaining === 0 ? 'synced' : 'error',
      lastSyncAt: remaining === 0 ? new Date().toISOString() : get().lastSyncAt,
    });

    return flushed;
  },

  syncPendingCount: async () => {
    const count = await countPendingChanges();
    set({ pendingChanges: count });
  },
}));
