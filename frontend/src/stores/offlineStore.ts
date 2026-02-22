import { create } from 'zustand';

interface OfflineState {
  isOffline: boolean;
  lastSyncAt: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';

  setOffline: (offline: boolean) => void;
  setLastSyncAt: (time: string) => void;
  setSyncStatus: (status: OfflineState['syncStatus']) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  lastSyncAt: null,
  syncStatus: 'synced',

  setOffline: (offline) => set({ isOffline: offline, syncStatus: offline ? 'offline' : 'synced' }),
  setLastSyncAt: (time) => set({ lastSyncAt: time }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));
