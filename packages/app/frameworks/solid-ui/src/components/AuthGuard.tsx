import { createEffect, type JSX, on } from 'solid-js'

import { t } from '@molecule/app-i18n'

import { createAuthState, createLocation } from '../utilities/services.js'

/**
 * Props for {@link AuthGuard}.
 *
 * All props are optional — the default behavior (loading tag → redirect
 * to `/login` → children) matches the bare-bones guard apps were
 * shipping locally. The props let apps customize per-call without
 * forking the component.
 */
export interface AuthGuardProps {
  /**
   * Element rendered while the auth status is `'loading'` — no session
   * decision yet. Overrides the default
   * `<div data-mol-id="auth-guard-loading">…</div>` loading tag — pass a
   * full-page spinner or any other UI you want during the auth bootstrap window.
   */
  loadingFallback?: JSX.Element
  /**
   * i18n key used for the default loading-tag text. Defaults to
   * `'common.loading'`. Ignored when `loadingFallback` is set.
   */
  loadingKey?: string
  /**
   * Fallback text if the i18n key is missing. Defaults to `'Loading...'`
   * (the project-canonical ASCII glyph — Phase C of the locale
   * canonicalization plan). Ignored when `loadingFallback` is set.
   */
  loadingDefault?: string
  /**
   * Path to redirect to when the auth status is `'unauthenticated'`.
   * Defaults to `'/login'`. The current location is preserved as
   * `state.from` for post-login restoration.
   */
  loginPath?: string
  /**
   * Callback invoked when `isAuthenticated` transitions to `true` (or is
   * already `true` on first render). Useful for one-shot per-app
   * bootstrap effects (e.g. seeding fixture data). The caller is
   * responsible for idempotency if the auth state can flip back and
   * forth — this fires on every transition.
   */
  onAuthenticated?: () => void
  /**
   * Children to render when authenticated. Defaults to nothing (the
   * React reference renders its router `<Outlet />`; this package's
   * router context has no outlet concept, and an outlet under the
   * conformance router renders nothing).
   */
  children?: JSX.Element
}

/**
 * The pathname part of a login path (`/login?next=x` → `/login`).
 *
 * @param loginPath - The guard's `loginPath`.
 * @returns Its pathname.
 */
const loginPathname = (loginPath: string): string => loginPath.split(/[?#]/)[0] || '/'

/**
 * Route guard for authenticated sections of the app tree.
 *
 * - While the auth status is `'loading'` (no session decision yet), renders the
 *   `loadingFallback` (or the default `<div data-mol-id="auth-guard-loading">{t('common.loading')}</div>`).
 * - If the status is `'unauthenticated'`, redirects to `loginPath` carrying
 *   the attempted location in `state.from` for post-login restoration. On
 *   `loginPath` itself it renders its children instead, so a guard that wraps
 *   the whole route tree (login page included) does not redirect in a loop.
 * - Otherwise renders `children`.
 *
 * The guard reads `status`, not `initialized`: a stored token AND user make the
 * FIRST render `'authenticated'`, so a protected page paints immediately instead
 * of waiting for the background verification or a current-user round trip.
 * `'unavailable'` (a retained candidate the server could not confirm) still
 * renders the page and lets the API decide. It is not a confirmed-session
 * boolean: `isAuthenticated` can be false and `user` can be null while a
 * token/cookie-only candidate is unavailable, so never redirect on the
 * boolean or require a profile in this state.
 *
 * The default loading tag carries `data-mol-id="auth-guard-loading"`
 * so AI agents and e2e tests can target it reliably. When the caller
 * passes a custom `loadingFallback`, it's the caller's responsibility
 * to include any data-mol-id they need.
 *
 * @param props - {@link AuthGuardProps}
 */
export function AuthGuard(props: AuthGuardProps): JSX.Element {
  const { state } = createAuthState()
  const { location, router } = createLocation()

  const status = (): string => state().status
  const isAuthenticated = (): boolean => state().authenticated
  const loginPath = (): string => props.loginPath ?? '/login'

  let lastAuth = false
  createEffect(() => {
    const authenticated = isAuthenticated()
    if (props.onAuthenticated && authenticated && !lastAuth) {
      props.onAuthenticated()
    }
    lastAuth = authenticated
  })

  // The unauthenticated redirect: replaces the current entry with the login
  // path, carrying the attempted location as `state.from`.
  createEffect(
    on(
      () => [status(), location().pathname, loginPath()] as const,
      () => {
        if (status() === 'unauthenticated' && location().pathname !== loginPathname(loginPath())) {
          router.navigate(loginPath(), { replace: true, state: { from: location() } })
        }
      },
    ),
  )

  if (status() === 'loading') {
    return (
      props.loadingFallback ?? (
        <div data-mol-id="auth-guard-loading">
          {t(
            props.loadingKey ?? 'common.loading',
            {},
            { defaultValue: props.loadingDefault ?? 'Loading...' },
          )}
        </div>
      )
    )
  }
  return props.children ?? null
}
