import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Note, NoteSummary, NoteCount } from '../types';

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
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
      const { data } = await api.get<ApiResponse<NoteSummary[]>>(`/notes?${params}`);
      return data;
    },
  });
}

export function useNoteCounts() {
  return useQuery({
    queryKey: ['notes', 'counts'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<NoteCount>>('/notes?count_only=true');
      return data.data ?? { total: 0, starred: 0, deleted: 0 };
    },
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Note>>(`/notes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Note>) => {
      const { data } = await api.post<ApiResponse<Note>>('/notes', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Note> & { id: string }) => {
      const { data } = await api.put<ApiResponse<Note>>(`/notes/${id}`, body);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<{ is_starred: boolean }>>(`/notes/${id}/star`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
