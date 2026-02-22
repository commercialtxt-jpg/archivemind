import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, Entity, EntityWithStats, EntityType, NoteSummary } from '../types';

export function useEntities(entityType?: EntityType) {
  return useQuery({
    queryKey: ['entities', entityType],
    queryFn: async () => {
      const params = entityType ? `?type=${entityType}` : '';
      const { data } = await api.get<ApiResponse<Entity[]>>(`/entities${params}`);
      return data;
    },
  });
}

export function useEntity(id: string | null) {
  return useQuery({
    queryKey: ['entities', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<EntityWithStats>>(`/entities/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useEntityNotes(id: string | null) {
  return useQuery({
    queryKey: ['entities', id, 'notes'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<NoteSummary[]>>(`/entities/${id}/notes`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useEntityTopics(id: string | null) {
  return useQuery({
    queryKey: ['entities', id, 'topics'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Array<{ id: string; name: string; note_count: number }>>>(`/entities/${id}/topics`);
      return data.data;
    },
    enabled: !!id,
  });
}
