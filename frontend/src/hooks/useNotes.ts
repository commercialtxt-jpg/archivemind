import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';
import type { ApiResponse, Note, NoteSummary, NoteCount } from '../types';
import { cacheNotes, getCachedNotes, getCachedNote } from '../lib/offlineDb';
import { useOfflineStore } from '../stores/offlineStore';

/** Check if an error is a network failure (offline, timeout, CORS block). */
function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    // Axios network error: no response received
    if ('code' in err && (err as { code?: string }).code === 'ERR_NETWORK') return true;
    if ('message' in err && typeof (err as { message?: string }).message === 'string') {
      const msg = (err as { message: string }).message.toLowerCase();
      if (msg.includes('network error') || msg.includes('failed to fetch')) return true;
    }
    // No response object at all → network level failure
    if ('response' in err && (err as { response?: unknown }).response === undefined) return true;
  }
  return false;
}

/** Generate a client-side offline ID. */
function offlineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Extract a 403 plan-limit error message from an Axios error, or null. */
function getPlanLimitError(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { status?: number; data?: { error?: string } } }).response;
    if (resp?.status === 403 && resp.data?.error) {
      return resp.data.error;
    }
  }
  return null;
}

/** Hook that exposes plan-limit error state for UI display. */
export function usePlanLimitError() {
  const [limitError, setLimitError] = useState<string | null>(null);
  return { limitError, setLimitError, clearLimitError: () => setLimitError(null) };
}

interface NoteFilters {
  note_type?: string;
  field_trip_id?: string;
  concept_id?: string;
  entity_id?: string;
  entity_type?: string;
  starred?: boolean;
  deleted?: boolean;
  sort?: string;
  order?: string;
  page?: number;
  per_page?: number;
}

const emptyList: ApiResponse<NoteSummary[]> = {
  data: [],
  meta: { total: 0, page: 1, per_page: 50 },
};

export function useNotes(filters: NoteFilters = {}) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
        });
        const { data } = await api.get<ApiResponse<NoteSummary[]>>(`/notes?${params}`);
        // Cache into IndexedDB for offline use
        if (data.data?.length) {
          cacheNotes(data.data).catch(() => {});
        }
        return data;
      } catch {
        // Try IndexedDB before returning empty
        const cached = await getCachedNotes();
        if (cached.length > 0) {
          return { data: cached, meta: { total: cached.length } } as ApiResponse<NoteSummary[]>;
        }
        return emptyList;
      }
    },
  });
}

export function useNoteCounts() {
  return useQuery({
    queryKey: ['notes', 'counts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<NoteCount>>('/notes?count_only=true');
        return data.data ?? { total: 0, starred: 0, deleted: 0 };
      } catch {
        return { total: 0, starred: 0, deleted: 0 } as NoteCount;
      }
    },
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Note>>(`/notes/${id}`);
        return data.data;
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Helper: find all cached note-list query keys
// ---------------------------------------------------------------------------
function getNoteListKeys(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient
    .getQueriesData<ApiResponse<NoteSummary[]>>({ queryKey: ['notes'] })
    .filter(([key]) => {
      // Exclude single-note keys like ['notes', 'some-id'] and counts
      const second = key[1];
      return second !== null && typeof second === 'object' && !Array.isArray(second);
    })
    .map(([key]) => key);
}

// ---------------------------------------------------------------------------
// useCreateNote — optimistic: prepend a placeholder to every list cache
// ---------------------------------------------------------------------------
export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Note>) => {
      try {
        const { data } = await api.post<ApiResponse<Note>>('/notes', body);
        return data.data;
      } catch (err) {
        if (isNetworkError(err) || useOfflineStore.getState().isOffline) {
          // Generate a client-side ID and queue for later sync
          const id = body.id || offlineId();
          const now = new Date().toISOString();

          const offlineNote: Note = {
            id,
            workspace_id: body.workspace_id ?? '',
            title: body.title ?? 'Untitled',
            body: (body.body as Record<string, unknown>) ?? { type: 'doc', content: [] },
            body_text: body.body_text ?? '',
            note_type: body.note_type ?? 'field_note',
            is_starred: body.is_starred ?? false,
            location_name: body.location_name ?? null,
            location_lat: body.location_lat ?? null,
            location_lng: body.location_lng ?? null,
            gps_coords: body.gps_coords ?? null,
            weather: body.weather ?? null,
            temperature_c: body.temperature_c ?? null,
            time_start: body.time_start ?? null,
            time_end: body.time_end ?? null,
            created_at: now,
            updated_at: now,
          } as Note;

          // Save to IndexedDB cache so it appears in note lists
          await cacheNotes([offlineNote as unknown as NoteSummary]);

          // Queue the POST for when we're back online
          await useOfflineStore.getState().queueChange({
            id: `pending-create-${id}`,
            method: 'POST',
            url: '/notes',
            body: { ...body, id },
          });

          return offlineNote;
        }
        throw err;
      }
    },
    onMutate: async (variables) => {
      // Cancel in-flight fetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // Build an optimistic NoteSummary from the partial body
      const optimistic: NoteSummary = {
        id: variables.id ?? `optimistic-${Date.now()}`,
        workspace_id: variables.workspace_id ?? '',
        title: variables.title ?? 'Untitled',
        body_text: variables.body_text ?? '',
        note_type: variables.note_type ?? 'field_note',
        is_starred: variables.is_starred ?? false,
        location_name: variables.location_name ?? null,
        gps_coords: variables.gps_coords ?? null,
        weather: variables.weather ?? null,
        tags: [],
        duration_seconds: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Snapshot all list caches
      const snapshots: Array<[unknown[], ApiResponse<NoteSummary[]> | undefined]> = [];
      const listKeys = getNoteListKeys(queryClient);
      for (const key of listKeys) {
        const prev = queryClient.getQueryData<ApiResponse<NoteSummary[]>>(key);
        snapshots.push([key as unknown[], prev]);
        if (prev) {
          queryClient.setQueryData<ApiResponse<NoteSummary[]>>(key, {
            ...prev,
            data: [optimistic, ...prev.data],
          });
        }
      }

      return { snapshots };
    },
    onError: (err, _vars, context) => {
      // Roll back all list caches on error
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
      // Emit plan-limit event for 403 responses
      const msg = getPlanLimitError(err);
      if (msg) {
        window.dispatchEvent(new CustomEvent('plan-limit-error', { detail: { resource: 'notes', message: msg } }));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateNote — optimistic: update matching note in list + single-note cache
// ---------------------------------------------------------------------------
export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Note> & { id: string }) => {
      try {
        const { data } = await api.put<ApiResponse<Note>>(`/notes/${id}`, body);
        return data.data;
      } catch (err) {
        if (isNetworkError(err) || useOfflineStore.getState().isOffline) {
          // Update local IndexedDB cache
          const existing = await getCachedNote(id);
          if (existing) {
            await cacheNotes([{ ...existing, ...body, updated_at: new Date().toISOString() } as NoteSummary]);
          }

          // Queue the PUT for sync
          await useOfflineStore.getState().queueChange({
            id: `pending-update-${id}-${Date.now()}`,
            method: 'PUT',
            url: `/notes/${id}`,
            body,
          });

          return { id, ...body } as Note;
        }
        throw err;
      }
    },
    onMutate: async (variables) => {
      const { id } = variables;

      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // Snapshot + update single-note cache
      const prevNote = queryClient.getQueryData<Note>(['notes', id]);
      if (prevNote) {
        queryClient.setQueryData<Note>(['notes', id], { ...prevNote, ...variables });
      }

      // Snapshot + update every list cache that contains this note
      const snapshots: Array<[unknown[], ApiResponse<NoteSummary[]> | undefined]> = [];
      const listKeys = getNoteListKeys(queryClient);
      for (const key of listKeys) {
        const prev = queryClient.getQueryData<ApiResponse<NoteSummary[]>>(key);
        snapshots.push([key as unknown[], prev]);
        if (prev) {
          queryClient.setQueryData<ApiResponse<NoteSummary[]>>(key, {
            ...prev,
            data: prev.data.map((n) =>
              n.id === id
                ? {
                    ...n,
                    title: variables.title ?? n.title,
                    body_text: variables.body_text ?? n.body_text,
                    updated_at: new Date().toISOString(),
                  }
                : n
            ),
          });
        }
      }

      return { prevNote, snapshots };
    },
    onError: (_err, variables, context) => {
      if (context?.prevNote) {
        queryClient.setQueryData(['notes', variables.id], context.prevNote);
      }
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteNote — optimistic: remove note from all list caches immediately
// ---------------------------------------------------------------------------
export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      const snapshots: Array<[unknown[], ApiResponse<NoteSummary[]> | undefined]> = [];
      const listKeys = getNoteListKeys(queryClient);
      for (const key of listKeys) {
        const prev = queryClient.getQueryData<ApiResponse<NoteSummary[]>>(key);
        snapshots.push([key as unknown[], prev]);
        if (prev) {
          queryClient.setQueryData<ApiResponse<NoteSummary[]>>(key, {
            ...prev,
            data: prev.data.filter((n) => n.id !== id),
          });
        }
      }

      return { snapshots };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useRestoreNote — optimistic: remove from trash list immediately
// ---------------------------------------------------------------------------
export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notes/${id}/restore`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const snapshots: Array<[unknown[], ApiResponse<NoteSummary[]> | undefined]> = [];
      const listKeys = getNoteListKeys(queryClient);
      for (const key of listKeys) {
        const prev = queryClient.getQueryData<ApiResponse<NoteSummary[]>>(key);
        snapshots.push([key as unknown[], prev]);
        if (prev) {
          queryClient.setQueryData<ApiResponse<NoteSummary[]>>(key, {
            ...prev,
            data: prev.data.filter((n) => n.id !== id),
          });
        }
      }
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// ---------------------------------------------------------------------------
// usePermanentDeleteNote — optimistic: remove from all list caches
// ---------------------------------------------------------------------------
export function usePermanentDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}/permanent`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const snapshots: Array<[unknown[], ApiResponse<NoteSummary[]> | undefined]> = [];
      const listKeys = getNoteListKeys(queryClient);
      for (const key of listKeys) {
        const prev = queryClient.getQueryData<ApiResponse<NoteSummary[]>>(key);
        snapshots.push([key as unknown[], prev]);
        if (prev) {
          queryClient.setQueryData<ApiResponse<NoteSummary[]>>(key, {
            ...prev,
            data: prev.data.filter((n) => n.id !== id),
          });
        }
      }
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useToggleStar — optimistic: flip is_starred immediately
// ---------------------------------------------------------------------------
export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<{ is_starred: boolean }>>(`/notes/${id}/star`);
      return data.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // Optimistically flip in all list caches
      const snapshots: Array<[unknown[], ApiResponse<NoteSummary[]> | undefined]> = [];
      const listKeys = getNoteListKeys(queryClient);
      for (const key of listKeys) {
        const prev = queryClient.getQueryData<ApiResponse<NoteSummary[]>>(key);
        snapshots.push([key as unknown[], prev]);
        if (prev) {
          queryClient.setQueryData<ApiResponse<NoteSummary[]>>(key, {
            ...prev,
            data: prev.data.map((n) =>
              n.id === id ? { ...n, is_starred: !n.is_starred } : n
            ),
          });
        }
      }

      // Also flip in single-note cache if present
      const prevNote = queryClient.getQueryData<Note>(['notes', id]);
      if (prevNote) {
        queryClient.setQueryData<Note>(['notes', id], {
          ...prevNote,
          is_starred: !prevNote.is_starred,
        });
      }

      return { snapshots, prevNote };
    },
    onError: (_err, id, context) => {
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
      if (context?.prevNote) {
        queryClient.setQueryData(['notes', id], context.prevNote);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
