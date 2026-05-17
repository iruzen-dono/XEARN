import useSWR from 'swr';
import { api } from '../api';
import type { Task, ApiError } from '@xearn/types';

/**
 * Hook SWR standardisé pour les tâches disponibles.
 */
export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<Task[], ApiError>(
    '/tasks',
    async (url: string) => {
      return await api<Task[]>(url);
    },
    {
      refreshInterval: 60000, // Refresh every 60s
      revalidateOnFocus: true,
    },
  );

  return {
    tasks: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook pour une tâche spécifique par slug.
 */
export function useTask(slug: string) {
  const { data, error, isLoading } = useSWR<Task, ApiError>(
    slug ? `/tasks/${slug}` : null,
    async (url: string) => {
      return await api<Task>(url);
    },
  );

  return {
    task: data,
    isLoading,
    error,
  };
}
