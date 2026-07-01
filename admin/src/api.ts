// Admin API client. Stores the admin JWT in localStorage.

export const API_BASE_URL = 'https://bahon-api.astory.workers.dev'

const TOKEN_KEY = 'bahon-admin-token'

export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = auth.get()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401 || res.status === 403) {
    auth.clear()
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `http_${res.status}`)
  }
  return (await res.json()) as T
}

export interface AdminUser {
  id: string
  email: string
  display_name: string | null
  created_at: string
  data_version: number
  data_updated_at: string | null
  tier: string | null
  status: string | null
  expires_at: string | null
}

export interface Subscription {
  user_id: string
  tier: string
  status: string
  source: string
  started_at: string | null
  expires_at: string | null
  notes: string | null
  updated_at: string
}

export const adminApi = {
  login: (username: string, password: string) =>
    req<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  users: (query: string, page: number) =>
    req<{ users: AdminUser[]; total: number; page: number; pageSize: number }>(
      `/api/admin/users?query=${encodeURIComponent(query)}&page=${page}`,
    ),
  user: (id: string) =>
    req<{ user: AdminUser; subscription: Subscription | null }>(`/api/admin/users/${id}`),
  setSubscription: (
    id: string,
    body: { tier: string; status: string; expiresAt: string | null; notes: string | null },
  ) =>
    req<{ ok: boolean; subscription: Subscription }>(`/api/admin/users/${id}/subscription`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    req<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  stats: () => req<{ users: number; pro: number; activeSubs: number }>('/api/admin/stats'),
}
