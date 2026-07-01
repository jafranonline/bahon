// Authenticated fetch wrapper: injects the Bearer token and retries once after
// a token refresh on 401. Used for Pro-gated endpoints (sync, agent).

import { API_BASE_URL } from '@utils/constants'
import { useAuthStore } from '@store/authStore'

interface ApiOptions extends RequestInit {
  /** Attach the access token (default true). */
  auth?: boolean
}

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { auth = true, headers, ...rest } = options

  const build = (): RequestInit => {
    const token = useAuthStore.getState().accessToken
    return {
      ...rest,
      headers: {
        ...headers,
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  }

  let res = await fetch(`${API_BASE_URL}${path}`, build())
  if (res.status === 401 && auth) {
    const ok = await useAuthStore.getState().refresh()
    if (ok) res = await fetch(`${API_BASE_URL}${path}`, build())
  }
  return res
}
