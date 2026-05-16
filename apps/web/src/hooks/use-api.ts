import useSWR from 'swr';
import { walletApi, tasksApi, referralsApi } from '@/lib/api';
import type { WalletOverview, ReferralTree } from '@/types';

/**
 * SWR hook for wallet overview data.
 * Revalidates on focus since balance can change frequently.
 */
export function useWallet(token: string | null) {
  return useSWR<WalletOverview>(token ? 'wallet' : null, () => walletApi.get(token!), {
    revalidateOnFocus: true,
  });
}

/**
 * SWR hook for recent transactions (page 1).
 */
export function useTransactions(token: string | null) {
  return useSWR(token ? 'transactions' : null, () => walletApi.getTransactions(token!, 1));
}

/**
 * SWR hook for user's task completions.
 */
export function useCompletions(token: string | null) {
  return useSWR(token ? 'completions' : null, () => tasksApi.getMyCompletions(token!));
}

/**
 * SWR hook for the referral tree.
 * Falls back to empty levels on error.
 */
export function useReferralTree(token: string | null) {
  return useSWR<ReferralTree>(token ? 'referral-tree' : null, () =>
    referralsApi
      .getTree(token!)
      .catch(() => ({ level1: [], level2: [], level3: [] }) as ReferralTree),
  );
}
