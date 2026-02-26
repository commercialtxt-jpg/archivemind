import { useQuery } from '@tanstack/react-query';
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
