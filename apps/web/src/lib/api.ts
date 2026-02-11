export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function rawFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { token, headers, ...rest } = options;
  return fetch(`${API_URL}/api${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

// --- Refresh token deduplication ---
// Si plusieurs requêtes 401 arrivent en parallèle, une seule refresh se lance
let refreshPromise: Promise<any> | null = null;

async function doRefresh(): Promise<any> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) throw new Error('No refresh token');

    const res = await rawFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });

    if (!res.ok) throw new Error('Refresh failed');

    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    // Notifier AuthContext du changement
    window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data }));
    return data;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  let res = await rawFetch(endpoint, options);

  // Si 401 et qu'on avait un token, tenter un refresh automatique
  if (res.status === 401 && options.token && typeof window !== 'undefined') {
    try {
      const data = await doRefresh();
      // Re-tenter la requête originale avec le nouveau token
      res = await rawFetch(endpoint, { ...options, token: data.accessToken });
    } catch {
      // Refresh échoué — session expirée, rediriger vers login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
  }

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
  resendVerification: (email: string) =>
    api('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

// Users
export const usersApi = {
  getProfile: (token: string) => api('/users/me', { token }),
  updateProfile: (token: string, data: { firstName?: string; lastName?: string; phone?: string }) =>
    api('/users/me', { method: 'PATCH', token, body: JSON.stringify(data) }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    api('/users/me/password', { method: 'PATCH', token, body: JSON.stringify({ currentPassword, newPassword }) }),
};

// Tasks
export const tasksApi = {
  getAll: (token: string, page = 1) => api(`/tasks?page=${page}`, { token }),
  start: (token: string, taskId: string) =>
    api(`/tasks/${taskId}/start`, { method: 'POST', token }),
  complete: (token: string, taskId: string) =>
    api(`/tasks/${taskId}/complete`, { method: 'POST', token }),
  getMyCompletions: (token: string) => api('/tasks/my-completions', { token }),
};

// Wallet
export const walletApi = {
  get: (token: string) => api('/wallet', { token }),
  getTransactions: (token: string, page = 1) => api(`/wallet/transactions?page=${page}`, { token }),
  activate: (token: string) => api<any>('/wallet/activate', { method: 'POST', token }),
  withdraw: (token: string, data: any) =>
    api('/wallet/withdraw', { method: 'POST', token, body: JSON.stringify(data) }),
};

// Referrals
export const referralsApi = {
  getTree: (token: string) => api('/referrals/tree', { token }),
  getCommissions: (token: string) => api('/referrals/commissions', { token }),
  getStats: (token: string) => api('/referrals/stats', { token }),
};

// Notifications
export const notificationsApi = {
  getAll: (token: string, page = 1) => api<any>(`/notifications?page=${page}`, { token }),
  getUnreadCount: (token: string) => api<{ count: number }>('/notifications/unread-count', { token }),
  markAsRead: (token: string, id: string) =>
    api(`/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllAsRead: (token: string) =>
    api('/notifications/read-all', { method: 'PATCH', token }),
};

// Admin
export const adminApi = {
  getUsers: (token: string, page = 1, search?: string, status?: string) => {
    let url = `/users?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status && status !== 'ALL') url += `&status=${status}`;
    return api(url, { token });
  },
  getUserStats: (token: string) => api('/users/stats', { token }),
  getAnalytics: (token: string) => api<any>('/users/analytics', { token }),
  reactivateUser: (token: string, id: string) => api(`/users/${id}/activate`, { method: 'PATCH', token }),
  suspendUser: (token: string, id: string) => api(`/users/${id}/suspend`, { method: 'PATCH', token }),
  banUser: (token: string, id: string) => api(`/users/${id}/ban`, { method: 'PATCH', token }),
  getAllTasks: (token: string, page = 1) => api(`/tasks/admin/all?page=${page}`, { token }),
  createTask: (token: string, data: any) =>
    api('/tasks/admin/create', { method: 'POST', token, body: JSON.stringify(data) }),
  toggleTask: (token: string, id: string) =>
    api(`/tasks/admin/${id}/toggle`, { method: 'PATCH', token }),
  updateTask: (token: string, id: string, data: any) =>
    api(`/tasks/admin/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  deleteTask: (token: string, id: string) =>
    api(`/tasks/admin/${id}`, { method: 'DELETE', token }),
  getWalletStats: (token: string) => api('/wallet/admin/stats', { token }),
  getPendingWithdrawals: (token: string, page = 1) =>
    api<any>(`/wallet/admin/withdrawals?page=${page}`, { token }),
  approveWithdrawal: (token: string, id: string) =>
    api(`/wallet/admin/withdrawals/${id}/approve`, { method: 'PATCH', token }),
  rejectWithdrawal: (token: string, id: string) =>
    api(`/wallet/admin/withdrawals/${id}/reject`, { method: 'PATCH', token }),
};
