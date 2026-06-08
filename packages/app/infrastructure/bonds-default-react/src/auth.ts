import type { AuthClient, AuthClientConfig, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient, setClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import {
  createFetchClient,
  getClient as getHttpClient,
  setClient as setHttpClient,
} from '@molecule/app-http'

/**
 * Builds the default fetch-based HTTP client + wires it into
 * `@molecule/app-http`. Replaces the per-app `bonds/http-default.ts`
 * shipped by ~52 fleet apps.
 *
 * @example
 * ```ts
 * // bonds/http-default.ts
 * import { createDefaultHttpClient } from '@molecule/app-bonds-default-react'
 * import { API_BASE_URL } from '../config.js'
 *
 * export const { httpClient, setupHttpDefault } = createDefaultHttpClient(API_BASE_URL)
 * ```
 */
export function createDefaultHttpClient(baseURL: string): {
  httpClient: HttpClient
  setupHttpDefault: () => void
} {
  const httpClient = createFetchClient({ baseURL })
  return {
    httpClient,
    setupHttpDefault: () => setHttpClient(httpClient),
  }
}

/**
 * Variant of `createDefaultHttpClient` that adds a request interceptor
 * injecting the JWT bearer token from the auth client AND (optionally)
 * stripping a leading `/api/` from request URLs.
 *
 * Replaces ~20 per-app `bonds/http-default.ts` files that hand-roll
 * this same wiring. Pass `stripApiPrefix: true` when the app uses
 * `baseURL: '/api'` to handle pages that pass `/api/`-prefixed paths
 * (would otherwise resolve to `/api/api/...` and 404).
 */
export function createDefaultHttpClientWithAuthBearer(opts: {
  baseURL: string
  withCredentials?: boolean
  stripApiPrefix?: boolean
  getToken: () => string | null | undefined
}): {
  httpClient: HttpClient
  setupHttpDefault: () => void
} {
  const httpClient = createFetchClient({
    baseURL: opts.baseURL,
    withCredentials: opts.withCredentials,
  })
  httpClient.addRequestInterceptor((config) => {
    if (opts.stripApiPrefix && typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/')
    }
    const token = opts.getToken()
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
    }
    return config
  })
  return {
    httpClient,
    setupHttpDefault: () => setHttpClient(httpClient),
  }
}

/**
 * Builds the default JWT auth client + wires it into `@molecule/app-auth`.
 *
 * Replaces the 16-line per-app `bonds/auth-default.ts` that 93 fleet
 * apps shipped byte-identically. Apps pass their own `authConfig`
 * (which lives in `src/config.ts`).
 *
 * @example
 * ```ts
 * // bonds/auth-default.ts
 * import { createDefaultAuthClient } from '@molecule/app-bonds-default-react'
 * import { authConfig } from '../config.js'
 *
 * export const { authClient, setupAuthDefault } =
 *   createDefaultAuthClient(authConfig)
 * ```
 */
export function createDefaultAuthClient<TUser extends UserProfile = UserProfile>(
  authConfig: AuthClientConfig,
): {
  authClient: AuthClient<TUser>
  setupAuthDefault: () => void
} {
  const authClient = createJWTAuthClient<TUser>(authConfig)
  return {
    authClient,
    setupAuthDefault: () => setClient(authClient),
  }
}

/**
 * Variant of `createDefaultAuthClient` that also keeps the bonded
 * `@molecule/app-http` client's bearer token in sync with auth events
 * (login / register / refresh / logout). Required by apps whose http
 * client must carry the JWT on every request — without this wiring,
 * authed endpoints return 401 after page reloads or token refresh.
 *
 * Hydrates the HTTP client's token from the persisted auth state
 * on setup, then listens for auth events to keep them aligned.
 */
export function createDefaultAuthClientWithHttpSync<TUser extends UserProfile = UserProfile>(
  authConfig: AuthClientConfig,
): {
  authClient: AuthClient<TUser>
  setupAuthDefault: () => void
} {
  const authClient = createJWTAuthClient<TUser>(authConfig)
  return {
    authClient,
    setupAuthDefault: () => {
      setClient(authClient)
      const initialToken = authClient.getAccessToken()
      if (initialToken) {
        getHttpClient().setAuthToken(initialToken)
      }
      authClient.addEventListener((event) => {
        if (event.type === 'login' || event.type === 'register' || event.type === 'refresh') {
          const token = authClient.getAccessToken()
          if (token) getHttpClient().setAuthToken(token)
        } else if (event.type === 'logout') {
          getHttpClient().setAuthToken(null)
        }
      })
    },
  }
}

/**
 * Most aggressive variant — bonds a fetch-based HTTP client with the
 * given `baseURL` (so molecule pkg `useGet('/path')` calls hit
 * `${baseURL}/path` instead of the SPA's catch-all route), AND keeps
 * its bearer token in sync with auth events.
 *
 * Used by apps where molecule packages render pricing / billing /
 * other authed JSON-fetching screens that need both behaviors.
 */
export function createDefaultAuthClientWithFetchClient<TUser extends UserProfile = UserProfile>(
  authConfig: AuthClientConfig,
  fetchClientOptions: { baseURL: string; withCredentials?: boolean },
): {
  authClient: AuthClient<TUser>
  setupAuthDefault: () => void
} {
  const authClient = createJWTAuthClient<TUser>(authConfig)
  return {
    authClient,
    setupAuthDefault: () => {
      const httpClient = createFetchClient({
        baseURL: fetchClientOptions.baseURL,
        withCredentials: fetchClientOptions.withCredentials ?? true,
      })
      setHttpClient(httpClient)
      setClient(authClient)
      const initialToken = authClient.getAccessToken()
      if (initialToken) {
        httpClient.setAuthToken(initialToken)
      }
      authClient.addEventListener((event) => {
        if (event.type === 'login' || event.type === 'register' || event.type === 'refresh') {
          const token = authClient.getAccessToken()
          if (token) httpClient.setAuthToken(token)
        } else if (event.type === 'logout') {
          httpClient.setAuthToken(null)
        }
      })
    },
  }
}
