import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Entity, EntityWithStats, EntityType, NoteSummary } from '../types';
import {
  getMockEntities,
  getMockEntity,
  getMockEntityTopics,
  getMockEntityNotes,
} from '../lib/mockData';
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
        // Try IndexedDB first before falling back to static mock data
        const cached = await getCachedEntities(entityType);
        if (cached.length > 0) {
          return { data: cached, meta: { total: cached.length } } as ApiResponse<EntityWithStats[]>;
        }
        return getMockEntities();
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
        return getMockEntity(id!);
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
        return getMockEntityNotes(id!);
      }
    },
    enabled: !!id,
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
        return getMockEntityTopics(id!);
      }
    },
    enabled: !!id,
  });
}
