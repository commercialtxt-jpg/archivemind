import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, SearchResults } from '../types';

const emptyResults: SearchResults = { notes: [], entities: [], concepts: [] };

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<SearchResults>>(`/search?q=${encodeURIComponent(query)}`);
        return data.data ?? emptyResults;
      } catch {
        return emptyResults;
      }
    },
    enabled: query.length >= 2,
  });
}
