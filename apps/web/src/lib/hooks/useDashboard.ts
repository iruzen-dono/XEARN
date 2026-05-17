import useSWR from 'swr';
import { api } from '../api';
import type { DashboardData, ApiError } from '@xearn/types';

/**
 * Hook SWR standardisé pour les données du dashboard.
 */
export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData, ApiError>(
    '/users/me',
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      refreshInterval: 30000, // Refresh every 30s
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    user: data?.user,
    wallet: data?.wallet,
    stats: data?.stats,
    recentTasks: data?.recentTasks ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
