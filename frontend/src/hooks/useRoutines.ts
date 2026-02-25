import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Routine } from '../types';

type ChecklistItem = { label?: string; done?: boolean };

export function useRoutines() {
  return useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Routine[]>>('/routines');
        return data;
      } catch {
        // No active routines in mock mode
        return { data: [] as Routine[] };
      }
    },
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; checklist?: unknown }) => {
      const { data } = await api.post<ApiResponse<Routine>>('/routines', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

export function useStartRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Routine>>(`/routines/${id}/start`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      checklist?: ChecklistItem[];
      name?: string;
    }) => {
      const { data } = await api.put<ApiResponse<Routine>>(`/routines/${id}`, body);
      return data.data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['routines'] });
      const prev = queryClient.getQueryData<ApiResponse<Routine[]>>(['routines']);
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
