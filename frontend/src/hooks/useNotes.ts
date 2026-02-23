import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Note, NoteSummary, NoteCount } from '../types';
import {
  getMockNotes,
  getMockNote,
  getMockNoteCounts,
} from '../lib/mockData';
import { cacheNotes, getCachedNotes } from '../lib/offlineDb';

interface NoteFilters {
  note_type?: string;
  field_trip_id?: string;
  concept_id?: string;
  entity_id?: string;
  starred?: boolean;
  deleted?: boolean;
  sort?: string;
  order?: string;
  page?: number;
  per_page?: number;
}

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
        // Try IndexedDB first before falling back to static mock data
        const cached = await getCachedNotes();
        if (cached.length > 0) {
          return { data: cached, meta: { total: cached.length } } as ApiResponse<NoteSummary[]>;
        }
        return getMockNotes();
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
        return data.data ?? getMockNoteCounts();
      } catch {
        return getMockNoteCounts();
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
        return getMockNote(id!) ?? null;
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
      // Exclude single-note keys like ['notes', 'mock-note-1'] and counts
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
      const { data } = await api.post<ApiResponse<Note>>('/notes', body);
      return data.data;
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
    onError: (_err, _vars, context) => {
      // Roll back all list caches on error
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
// useUpdateNote — optimistic: update matching note in list + single-note cache
// ---------------------------------------------------------------------------
export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Note> & { id: string }) => {
      const { data } = await api.put<ApiResponse<Note>>(`/notes/${id}`, body);
      return data.data;
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
