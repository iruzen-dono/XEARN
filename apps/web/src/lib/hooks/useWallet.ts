import useSWR from 'swr';
import { api } from '../api';
import type { WalletData, ApiError } from '@xearn/types';

/**
 * Hook SWR standardisé pour les données du wallet.
 * - Auto-refresh toutes les 30s
 * - Error handling unifié
 * - Revalidation au focus
 */
export function useWallet() {
  const { data, error, isLoading, mutate } = useSWR<WalletData, ApiError>(
    '/wallet',
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      refreshInterval: 30000, // Refresh every 30s
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    },
  );

  return {
    wallet: data?.wallet,
    recentWithdrawals: data?.recentWithdrawals ?? [],
    fees: data?.fees,
    isLoading,
    error,
    refresh: mutate,
  };
}
