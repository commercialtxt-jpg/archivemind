import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Entity, EntityWithStats, EntityType, NoteSummary } from '../types';
import { cacheEntities, getCachedEntities } from '../lib/offlineDb';

export function useEntities(entityType?: EntityType) {
  return useQuery({
    queryKey: ['entities', entityType],
    queryFn: async () => {
      try {
        const params = entityType ? `?type=${entityType}` : '';
        const { data } = await api.get<ApiResponse<Entity[]>>(`/entities${params}`);
        // Cache into IndexedDB for offline use
        if (data.data?.length) {
          cacheEntities(data.data as EntityWithStats[]).catch(() => {});
        }
        return data;
      } catch {
        // Try IndexedDB before returning empty
        const cached = await getCachedEntities(entityType);
        if (cached.length > 0) {
          return { data: cached, meta: { total: cached.length } } as ApiResponse<EntityWithStats[]>;
        }
        return { data: [] as EntityWithStats[], meta: { total: 0 } };
      }
    },
  });
}

export function useEntity(id: string | null) {
  return useQuery({
    queryKey: ['entities', id],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<EntityWithStats>>(`/entities/${id}`);
        return data.data;
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });
}

export function useEntityNotes(id: string | null) {
  return useQuery({
    queryKey: ['entities', id, 'notes'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<NoteSummary[]>>(`/entities/${id}/notes`);
        return data.data;
      } catch {
        return [] as NoteSummary[];
      }
    },
    enabled: !!id,
  });
}

export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; entity_type?: EntityType; role?: string }) => {
      const { data } = await api.post<ApiResponse<Entity>>('/entities', {
        name: payload.name,
        entity_type: payload.entity_type ?? 'person',
        role: payload.role ?? null,
      });
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all entity queries so lists refresh
      qc.invalidateQueries({ queryKey: ['entities'] });
    },
  });
}

export function useEntityTopics(id: string | null) {
  return useQuery({
    queryKey: ['entities', id, 'topics'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Array<{ id: string; name: string; note_count: number }>>>(`/entities/${id}/topics`);
        return data.data;
      } catch {
        return [] as Array<{ id: string; name: string; note_count: number }>;
      }
    },
    enabled: !!id,
  });
}
