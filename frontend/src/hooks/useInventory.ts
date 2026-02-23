import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, InventoryItem } from '../types';
import { getMockInventory } from '../lib/mockData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the cached inventory list data, or undefined if not cached yet. */
function getInventorySnapshot(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.getQueryData<ApiResponse<InventoryItem[]>>(['inventory']);
}

// ---------------------------------------------------------------------------
// useInventory — read
// ---------------------------------------------------------------------------

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<InventoryItem[]>>('/inventory');
        return data;
      } catch {
        return getMockInventory();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useCreateInventoryItem — optimistic: prepend placeholder
// ---------------------------------------------------------------------------

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      icon?: string;
      status?: string;
      sort_order?: number;
    }) => {
      const { data } = await api.post<ApiResponse<InventoryItem>>('/inventory', body);
      return data.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      const prev = getInventorySnapshot(queryClient);

      const optimistic: InventoryItem = {
        id: `optimistic-${Date.now()}`,
        workspace_id: '',
        name: variables.name,
        icon: variables.icon ?? '📦',
        status: variables.status ?? 'packed',
        sort_order: variables.sort_order ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (prev) {
        queryClient.setQueryData<ApiResponse<InventoryItem[]>>(['inventory'], {
          ...prev,
          data: [...prev.data, optimistic],
        });
      }

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['inventory'], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateInventoryItem — optimistic: update in-place
// ---------------------------------------------------------------------------

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      icon?: string;
      status?: string;
      sort_order?: number;
    }) => {
      const { data } = await api.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, body);
      return data.data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      const prev = getInventorySnapshot(queryClient);

      if (prev) {
        queryClient.setQueryData<ApiResponse<InventoryItem[]>>(['inventory'], {
          ...prev,
          data: prev.data.map((item) =>
            item.id === id
              ? { ...item, ...updates, updated_at: new Date().toISOString() }
              : item
          ),
        });
      }

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['inventory'], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteInventoryItem — optimistic: remove immediately
// ---------------------------------------------------------------------------

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      const prev = getInventorySnapshot(queryClient);

      if (prev) {
        queryClient.setQueryData<ApiResponse<InventoryItem[]>>(['inventory'], {
          ...prev,
          data: prev.data.filter((item) => item.id !== id),
        });
      }

      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['inventory'], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
