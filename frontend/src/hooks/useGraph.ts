import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, GraphData } from '../types';

export function useGraph(filter?: string) {
  return useQuery({
    queryKey: ['graph', filter],
    queryFn: async () => {
      const params = filter ? `?filter=${filter}` : '';
      const { data } = await api.get<ApiResponse<GraphData>>(`/graph${params}`);
      return data.data ?? { nodes: [], edges: [] };
    },
  });
}
