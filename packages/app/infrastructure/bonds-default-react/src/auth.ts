import { createJWTAuthClient, setClient } from '@molecule/app-auth'
import type { AuthClient, AuthClientConfig, UserProfile } from '@molecule/app-auth'

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
