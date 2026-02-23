import { create } from 'zustand';

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
}

export const useOfflineStore = create<OfflineState>((set) => ({
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
}));
