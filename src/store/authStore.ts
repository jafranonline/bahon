import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_BASE_URL } from '@utils/constants'
import { apiFetch } from '@api/client'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  emailVerified: boolean
}

export interface Entitlements {
  pro: boolean
  expiresAt: string | null
}

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null // memory only (not persisted)
  refreshToken: string | null // persisted
  entitlements: Entitlements | null
  status: AuthStatus
  register: (email: string, password: string, displayName?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  loadMe: () => Promise<void>
  getAccessToken: () => string | null
  // Email verification & password recovery.
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: () => Promise<void>
}

async function postJSON(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? `http_${res.status}`
  } catch {
    return `http_${res.status}`
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      entitlements: null,
      status: 'anonymous',

      getAccessToken: () => get().accessToken,

      register: async (email, password, displayName) => {
        set({ status: 'authenticating' })
        const res = await postJSON('/api/auth/register', { email, password, displayName })
        if (!res.ok) {
          set({ status: 'anonymous' })
          throw new Error(await errorMessage(res))
        }
        const data = (await res.json()) as {
          accessToken: string
          refreshToken: string
          user: AuthUser
        }
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          status: 'authenticated',
        })
        await get().loadMe()
      },

      login: async (email, password) => {
        set({ status: 'authenticating' })
        const res = await postJSON('/api/auth/login', { email, password })
        if (!res.ok) {
          set({ status: 'anonymous' })
          throw new Error(await errorMessage(res))
        }
        const data = (await res.json()) as {
          accessToken: string
          refreshToken: string
          user: AuthUser
        }
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          status: 'authenticated',
        })
        await get().loadMe()
      },

      logout: async () => {
        const rt = get().refreshToken
        if (rt) void postJSON('/api/auth/logout', { refreshToken: rt }).catch(() => {})
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          entitlements: null,
          status: 'anonymous',
        })
      },

      refresh: async () => {
        const rt = get().refreshToken
        if (!rt) return false
        const res = await postJSON('/api/auth/refresh', { refreshToken: rt })
        if (!res.ok) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            entitlements: null,
            status: 'anonymous',
          })
          return false
        }
        const data = (await res.json()) as { accessToken: string; refreshToken: string }
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        return true
      },

      loadMe: async () => {
        let token = get().accessToken
        if (!token) {
          const ok = await get().refresh()
          if (!ok) return
          token = get().accessToken
        }
        let res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          const ok = await get().refresh()
          if (!ok) return
          res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${get().accessToken}` },
          })
        }
        if (!res.ok) return
        const data = (await res.json()) as { user: AuthUser; entitlements: Entitlements }
        set({ user: data.user, entitlements: data.entitlements, status: 'authenticated' })
      },

      forgotPassword: async (email) => {
        // Server always responds 200 (no account enumeration); only surface
        // transport/JSON errors.
        const res = await postJSON('/api/auth/forgot-password', { email })
        if (!res.ok) throw new Error(await errorMessage(res))
      },

      resetPassword: async (token, newPassword) => {
        const res = await postJSON('/api/auth/reset-password', { token, newPassword })
        if (!res.ok) throw new Error(await errorMessage(res))
      },

      verifyEmail: async (token) => {
        const res = await postJSON('/api/auth/verify-email', { token })
        if (!res.ok) throw new Error(await errorMessage(res))
        // Refresh cached user if this device is signed in.
        if (get().accessToken || get().refreshToken) await get().loadMe()
      },

      resendVerification: async () => {
        const res = await apiFetch('/api/auth/resend-verification', { method: 'POST' })
        if (!res.ok) throw new Error(await errorMessage(res))
      },
    }),
    {
      name: 'bahon-auth',
      // Persist only the refresh token; access token stays in memory.
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
)
