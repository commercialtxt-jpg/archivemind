import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, MapLocation } from '../types';

export function useMapLocations() {
  return useQuery({
    queryKey: ['map', 'locations'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<MapLocation[]>>('/map/locations');
        return data.data ?? [];
      } catch {
        return [] as MapLocation[];
      }
    },
    staleTime: 60_000,
  });
}
