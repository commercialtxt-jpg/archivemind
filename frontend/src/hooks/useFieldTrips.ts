import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, FieldTrip } from '../types';

export function useFieldTrips() {
  return useQuery({
    queryKey: ['field-trips'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<FieldTrip[]>>('/field-trips');
        return data.data ?? [];
      } catch {
        return [] as FieldTrip[];
      }
    },
    staleTime: 60_000,
  });
}

export function useCreateFieldTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; icon?: string }) => {
      const { data } = await api.post<ApiResponse<FieldTrip>>('/field-trips', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-trips'] });
    },
  });
}

export function useUpdateFieldTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; icon?: string }) => {
      const { data } = await api.put<ApiResponse<FieldTrip>>(`/field-trips/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-trips'] });
    },
  });
}

export function useDeleteFieldTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/field-trips/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['field-trips'] });
      const prev = queryClient.getQueryData<FieldTrip[]>(['field-trips']);
      if (prev) {
        queryClient.setQueryData<FieldTrip[]>(['field-trips'], prev.filter((ft) => ft.id !== id));
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['field-trips'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['field-trips'] });
    },
  });
}
