import useSWR from 'swr';
import { api } from '../api';
import type { ReferralTreeData, ApiError } from '@xearn/types';

/**
 * Hook SWR standardisé pour les données de parrainage.
 */
export function useReferrals() {
  const { data, error, isLoading, mutate } = useSWR<ReferralTreeData, ApiError>(
    '/referrals/tree',
    async (url: string) => {
      return await api<ReferralTreeData>(url);
    },
    {
      refreshInterval: 60000, // Refresh every 60s
      revalidateOnFocus: true,
    },
  );

  return {
    level1: data?.level1 ?? [],
    level2: data?.level2 ?? [],
    level3: data?.level3 ?? [],
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
  };
}
