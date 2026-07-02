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
  loginWithGoogle: (credential: string) => Promise<void>
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

// Single-flight guard for token refresh. The refresh token is single-use and
// rotates on the server, so two concurrent refreshes (StrictMode double-mount,
// the bootstrap racing an apiFetch 401 retry, or the sync engine) would each
// spend it — the loser gets a 401 and would wipe the whole session. Coalesce
// all concurrent callers onto one network refresh.
let refreshInFlight: Promise<boolean> | null = null

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

      loginWithGoogle: async (credential) => {
        set({ status: 'authenticating' })
        // The server signs in, links, or creates the account as appropriate.
        const res = await postJSON('/api/auth/google', { credential })
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
        // Coalesce concurrent refreshes onto one in-flight request so the
        // single-use refresh token rotates exactly once (see refreshInFlight).
        if (refreshInFlight) return refreshInFlight
        refreshInFlight = (async () => {
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
        })()
        try {
          return await refreshInFlight
        } finally {
          refreshInFlight = null
        }
      },

      loadMe: async () => {
        // Network errors must NOT drop the (optimistically restored) session —
        // an offline reload keeps the persisted account UI. Only an explicit
        // 401 on the refresh token ends the session (inside refresh()).
        try {
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
        } catch {
          /* offline / transient — revalidate on the next launch or sync */
        }
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
      // Persist the session identity (not the short-lived access token), so a
      // reload — or an offline launch — restores the signed-in UI instantly
      // instead of flashing the logged-out state while loadMe() round-trips.
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        entitlements: state.entitlements,
      }),
      // Hydrate as authenticated when a session was persisted; loadMe()
      // revalidates in the background and refresh() drops the session on a
      // real 401. localStorage hydration is synchronous, so the very first
      // render already sees the restored status (no logged-out flash).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AuthState>
        return {
          ...current,
          ...p,
          status: p.refreshToken && p.user ? 'authenticated' : 'anonymous',
        }
      },
    },
  ),
)
