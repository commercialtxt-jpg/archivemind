import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Routine, ChecklistItem } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRoutinesSnapshot(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.getQueryData<ApiResponse<Routine[]>>(['routines']);
}

// ---------------------------------------------------------------------------
// useRoutines — read list
// ---------------------------------------------------------------------------

export function useRoutines() {
  return useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Routine[]>>('/routines');
        return data;
      } catch {
        return { data: [] as Routine[] };
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useCreateRoutine
// ---------------------------------------------------------------------------

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      icon?: string;
      field_trip_id?: string | null;
      checklist?: ChecklistItem[];
    }) => {
      const { data } = await api.post<ApiResponse<Routine>>('/routines', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateRoutine — optimistic update with checklist toggling
// ---------------------------------------------------------------------------

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      icon?: string;
      field_trip_id?: string | null;
      checklist?: ChecklistItem[];
      is_active?: boolean;
    }) => {
      const { data } = await api.put<ApiResponse<Routine>>(`/routines/${id}`, body);
      return data.data;
    },
    onMutate: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const prev = getRoutinesSnapshot(queryClient);
      if (prev) {
        queryClient.setQueryData<ApiResponse<Routine[]>>(['routines'], {
          ...prev,
          data: prev.data.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['routines'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useStartRoutine — sets is_active = true, deactivates all others
// ---------------------------------------------------------------------------

export function useStartRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Routine>>(`/routines/${id}/start`);
      return data.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const prev = getRoutinesSnapshot(queryClient);
      if (prev) {
        queryClient.setQueryData<ApiResponse<Routine[]>>(['routines'], {
          ...prev,
          data: prev.data.map((r) =>
            r.id === id ? { ...r, is_active: true } : { ...r, is_active: false }
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['routines'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useStopRoutine — sets is_active = false
// ---------------------------------------------------------------------------

export function useStopRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Routine>>(`/routines/${id}/stop`);
      return data.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const prev = getRoutinesSnapshot(queryClient);
      if (prev) {
        queryClient.setQueryData<ApiResponse<Routine[]>>(['routines'], {
          ...prev,
          data: prev.data.map((r) =>
            r.id === id ? { ...r, is_active: false } : r
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['routines'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteRoutine — removes the routine
// ---------------------------------------------------------------------------

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/routines/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const prev = getRoutinesSnapshot(queryClient);
      if (prev) {
        queryClient.setQueryData<ApiResponse<Routine[]>>(['routines'], {
          ...prev,
          data: prev.data.filter((r) => r.id !== id),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['routines'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}
