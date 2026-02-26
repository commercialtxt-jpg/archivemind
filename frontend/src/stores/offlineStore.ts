import { create } from 'zustand';
import {
  enqueuePendingChange,
  getPendingChanges,
  removePendingChange,
  countPendingChanges,
  getAllMediaBlobs,
  removeMediaBlob,
  countMediaBlobs,
  type PendingChange,
} from '../lib/offlineDb';
import api from '../lib/api';
import type { ApiResponse, Media } from '../types';

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
   * Returns the number of changes that were successfully flushed,
   * plus a map of offline client IDs → server IDs for created notes.
   */
  flushPendingChanges: () => Promise<{ flushed: number; idMap: Record<string, string> }>;

  /**
   * Upload all queued media blobs, remapping offline note IDs to real server IDs.
   * Called after flushPendingChanges when coming back online.
   */
  flushMediaBlobs: (idMap: Record<string, string>) => Promise<number>;

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
    if (changes.length === 0) return { flushed: 0, idMap: {} };

    set({ syncStatus: 'syncing' });
    let flushed = 0;
    const idMap: Record<string, string> = {};

    for (const change of changes) {
      try {
        if (change.method === 'POST') {
          const resp = await api.post(change.url, change.body);
          // Track offline ID → server ID mapping for note creates
          const body = change.body as Record<string, unknown> | null;
          const clientId = body?.id as string | undefined;
          const serverId = resp.data?.data?.id as string | undefined;
          if (clientId?.startsWith('offline-') && serverId) {
            idMap[clientId] = serverId;
          }
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
    const blobCount = await countMediaBlobs();
    set({
      pendingChanges: remaining + blobCount,
      syncStatus: remaining === 0 && blobCount === 0 ? 'synced' : (remaining > 0 ? 'error' : 'syncing'),
      lastSyncAt: remaining === 0 && blobCount === 0 ? new Date().toISOString() : get().lastSyncAt,
    });

    return { flushed, idMap };
  },

  flushMediaBlobs: async (idMap: Record<string, string>) => {
    const blobs = await getAllMediaBlobs();
    if (blobs.length === 0) return 0;

    let uploaded = 0;

    for (const blob of blobs) {
      try {
        // Remap offline note ID → server note ID
        const noteId = idMap[blob.noteId] ?? blob.noteId;

        // Build FormData from stored ArrayBuffer
        const file = new File([blob.data], blob.filename, { type: blob.mimeType });
        const form = new FormData();
        form.append('file', file);
        form.append('note_id', noteId);
        form.append('media_type', blob.mediaType);

        await api.post<ApiResponse<Media>>('/media/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        await removeMediaBlob(blob.id);
        uploaded++;
      } catch (err) {
        console.warn('[offlineStore] Failed to upload media blob:', blob.id, err);
        break;
      }
    }

    const remaining = await countPendingChanges();
    const blobsLeft = await countMediaBlobs();
    set({
      pendingChanges: remaining + blobsLeft,
      syncStatus: remaining === 0 && blobsLeft === 0 ? 'synced' : 'error',
      lastSyncAt: remaining === 0 && blobsLeft === 0 ? new Date().toISOString() : get().lastSyncAt,
    });

    return uploaded;
  },

  syncPendingCount: async () => {
    const pendingCount = await countPendingChanges();
    const blobCount = await countMediaBlobs();
    set({ pendingChanges: pendingCount + blobCount });
  },
}));
