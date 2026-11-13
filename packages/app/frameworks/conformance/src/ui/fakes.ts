/**
 * Framework-neutral fake services. Every adapter passes the SAME fake into its
 * own provider (React `AuthProvider`, Vue `createAuthPlugin`, Solid/Svelte
 * `MoleculeProvider`/`setMoleculeContext`, Angular `provideAuth`), and every
 * call a component makes on a service is recorded as `auth.logout`,
 * `theme.toggleMode`, …, so service use is compared like callback props.
 *
 * @module
 */

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { Theme, ThemeProvider } from '@molecule/app-theme'
import { createDarkTheme, createLightTheme } from '@molecule/app-theme'

import type { CaseContext } from './spec.js'

/** Receives each service call. */
export type ServiceCallSink = (name: string, args: unknown[]) => void

/**
 * Creates a fake auth client whose state is fixed by the case context.
 * `logout()` moves it to `unauthenticated`, as the real client does.
 *
 * @param auth - The case's auth context.
 * @param record - Receives every mutating call.
 * @returns An `AuthClient`.
 */
export function createFakeAuthClient(
  auth: NonNullable<CaseContext['auth']>,
  record: ServiceCallSink,
): AuthClient<Record<string, unknown>> {
  type User = Record<string, unknown>
  let state: AuthState<User> = {
    status: auth.status,
    initialized: auth.status !== 'loading',
    authenticated: auth.status === 'authenticated',
    user: auth.user ?? null,
    loading: auth.status === 'loading',
    error: null,
  }
  let revision = 1
  const listeners = new Set<(s: AuthState<User>) => void>()
  const set = (next: Partial<AuthState<User>>): void => {
    state = { ...state, ...next }
    revision++
    for (const l of listeners) l(state)
  }
  const result = async (): Promise<never> =>
    ({ user: state.user as User, accessToken: 'token' }) as never
  const client: AuthClient<User> = {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    getSessionRevision: () => revision,
    setUser: (user) => {
      record('auth.setUser', [user])
      set({ user })
    },
    getAccessToken: () => (state.authenticated ? 'token' : null),
    setAccessToken: (token) => record('auth.setAccessToken', [token]),
    setSession: (session) => {
      record('auth.setSession', [session])
      set({
        status: 'authenticated',
        authenticated: true,
        user: (session as { user?: User }).user ?? null,
      })
    },
    getRefreshToken: () => null,
    login: async (credentials) => {
      record('auth.login', [credentials])
      return result()
    },
    logout: async () => {
      record('auth.logout', [])
      set({ status: 'unauthenticated', authenticated: false, user: null })
    },
    register: async (data) => {
      record('auth.register', [data])
      return result()
    },
    refresh: async () => result(),
    requestPasswordReset: async (data) => record('auth.requestPasswordReset', [data]),
    confirmPasswordReset: async (data) => record('auth.confirmPasswordReset', [data]),
    updateProfile: async (data) => {
      record('auth.updateProfile', [data])
      return { ...(state.user ?? {}), ...data }
    },
    changePassword: async (oldPassword, newPassword) =>
      record('auth.changePassword', [oldPassword, newPassword]),
    initialize: async () => undefined,
    whenRestored: async () => undefined,
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    onAuthChange: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    addEventListener: () => () => undefined,
    destroy: () => listeners.clear(),
  }
  return client
}

/**
 * Creates a fake theme provider with a light and a dark theme.
 *
 * @param mode - Initial mode.
 * @param record - Receives every mutating call.
 * @returns A `ThemeProvider`.
 */
export function createFakeThemeProvider(
  mode: 'light' | 'dark',
  record: ServiceCallSink,
): ThemeProvider {
  const light = createLightTheme()
  const dark = createDarkTheme()
  let theme: Theme = mode === 'dark' ? dark : light
  const listeners = new Set<(t: Theme) => void>()
  const emit = (): void => {
    for (const l of listeners) l(theme)
  }
  return {
    getTheme: () => theme,
    setTheme: (next) => {
      record('theme.setTheme', [typeof next === 'string' ? next : next.mode])
      theme =
        typeof next === 'string' ? (next === dark.name || next === 'dark' ? dark : light) : next
      emit()
    },
    toggleMode: () => {
      record('theme.toggleMode', [])
      theme = theme.mode === 'dark' ? light : dark
      emit()
    },
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getThemes: () => [light, dark],
  }
}
