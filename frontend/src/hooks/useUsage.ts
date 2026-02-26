import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiResponse, UsageResponse, UsageRecord } from '../types';

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UsageResponse>>('/usage');
      return data.data;
    },
  });
}

export function useUsageHistory() {
  return useQuery({
    queryKey: ['usage', 'history'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UsageRecord[]>>('/usage/history');
      return data.data;
    },
  });
}

export function usePlan() {
  return useQuery({
    queryKey: ['settings', 'plan'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UsageResponse>>('/settings/plan');
      return data.data;
    },
  });
}
