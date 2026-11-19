/**
 * Shared harness for the AuthGuard test suites: a real `@molecule/app-auth`
 * client, a real in-memory router and the real Svelte context, mounted through
 * `AuthGuardHost.svelte` the way an application wires its root layout.
 *
 * @module
 */
import { mount, unmount } from 'svelte'

import type { AuthClient, StorageAdapter, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import AuthGuardHost from './AuthGuardHost.svelte'

/** Options for {@link mountGuard}. */
export interface GuardOptions {
  /** History entries; defaults to `['/']`. */
  initialEntries?: string[]
  /** A router to use (already spied on, for example). */
  router?: Router
  /** The guard's `loginPath`. */
  loginPath?: string
  /** Label rendered for the `/login` page. */
  loginLabel?: string
}

/** A mounted guard and the router behind it. */
export interface MountedGuard {
  /** The router the guard navigates with. */
  router: Router
  /** Unmounts the guard and releases the router. */
  destroy: () => void
}

/**
 * Mounts `AuthGuardHost` with the given auth client.
 *
 * @param auth - The real auth client the guard and its host read.
 * @param options - Router, login path and page labels.
 * @returns The mounted guard.
 */
export function mountGuard(
  auth: AuthClient<UserProfile>,
  options: GuardOptions = {},
): MountedGuard {
  const router =
    options.router ?? createMemoryRouter({ initialEntries: options.initialEntries ?? ['/'] })
  const i18n = createSimpleI18nProvider()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(AuthGuardHost, {
    target: host,
    props: {
      auth,
      router,
      i18n,
      loginPath: options.loginPath,
      loginLabel: options.loginLabel,
    },
  })
  return {
    router,
    destroy: () => {
      unmount(instance)
      host.remove()
      router.destroy?.()
    },
  }
}

/** A real client whose only credential is the cookie-session presence hint. */
export function cookieClient(): AuthClient<UserProfile> {
  document.cookie = 'mol_auth=1; path=/'
  return createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
}

/** A real client with a Bearer candidate but no cached profile. */
export function bearerClient(profile?: UserProfile): {
  client: AuthClient<UserProfile>
  token: string
} {
  const token = [
    btoa('{}'),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    'signature',
  ].join('.')
  const values = new Map([['molecule:auth:accessToken', token]])
  if (profile) values.set('molecule:auth:user', JSON.stringify(profile))
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  return { client: createJWTAuthClient<UserProfile>({ storage, autoRefresh: false }), token }
}

/** A real client with no stored credential: it settles to `unauthenticated`. */
export function signedOutClient(): AuthClient<UserProfile> {
  return createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
}
