const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || 'Une erreur est survenue');
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: any) => api('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => api('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  refresh: (refreshToken: string) =>
    api('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};

// Users
export const usersApi = {
  getProfile: (token: string) => api('/users/me', { token }),
};

// Tasks
export const tasksApi = {
  getAll: (token: string, page = 1) => api(`/tasks?page=${page}`, { token }),
  complete: (token: string, taskId: string) =>
    api(`/tasks/${taskId}/complete`, { method: 'POST', token }),
  getMyCompletions: (token: string) => api('/tasks/my-completions', { token }),
};

// Wallet
export const walletApi = {
  get: (token: string) => api('/wallet', { token }),
  getTransactions: (token: string, page = 1) => api(`/wallet/transactions?page=${page}`, { token }),
  activate: (token: string) => api('/wallet/activate', { method: 'POST', token }),
  withdraw: (token: string, data: any) =>
    api('/wallet/withdraw', { method: 'POST', token, body: JSON.stringify(data) }),
};

// Referrals
export const referralsApi = {
  getTree: (token: string) => api('/referrals/tree', { token }),
  getCommissions: (token: string) => api('/referrals/commissions', { token }),
  getStats: (token: string) => api('/referrals/stats', { token }),
};
