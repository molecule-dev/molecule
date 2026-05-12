import { createJWTAuthClient, setClient } from '@molecule/app-auth'
import type { AuthClient, AuthClientConfig, UserProfile } from '@molecule/app-auth'
import { getClient as getHttpClient } from '@molecule/app-http'

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
