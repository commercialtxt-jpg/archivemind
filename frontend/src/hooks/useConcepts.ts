import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Concept } from '../types';

export function useConcepts() {
  return useQuery({
    queryKey: ['concepts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Concept[]>>('/concepts');
        return data.data ?? [];
      } catch {
        return [] as Concept[];
      }
    },
    staleTime: 60_000,
  });
}

export function useCreateConcept() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; category?: string; icon?: string }) => {
      const { data } = await api.post<ApiResponse<Concept>>('/concepts', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });
}

export function useUpdateConcept() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string; name?: string; category?: string; icon?: string }) => {
      const { data } = await api.put<ApiResponse<Concept>>(`/concepts/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });
}

export function useDeleteConcept() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/concepts/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['concepts'] });
      const prev = queryClient.getQueryData<Concept[]>(['concepts']);
      if (prev) {
        queryClient.setQueryData<Concept[]>(['concepts'], prev.filter((c) => c.id !== id));
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['concepts'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });
}
