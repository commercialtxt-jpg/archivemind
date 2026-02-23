import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, SearchResults } from '../types';
import { getMockSearchResults } from '../lib/mockData';

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<SearchResults>>(`/search?q=${encodeURIComponent(query)}`);
        return data.data ?? { notes: [], entities: [], concepts: [] };
      } catch {
        return getMockSearchResults(query);
      }
    },
    enabled: query.length >= 2,
  });
}
