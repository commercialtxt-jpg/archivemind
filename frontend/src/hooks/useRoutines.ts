import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Routine } from '../types';

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
