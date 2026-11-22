import { createEffect, type JSX, on, Show } from 'solid-js'

import { RoutedView, useAuth, useRouter, useTranslation } from '@molecule/app-solid'

/**
 * Props for {@link AuthGuard}.
 *
 * All props are optional — the default behavior (loading tag → redirect
 * to `/login` → the routed page) matches the bare-bones guard apps were
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
   * Children to render when authenticated. Without them the guard renders
   * `<RoutedView />`: the matched child route, through whichever routing bond
   * the app wired. That throws when the routing bond has no routed view: pass
   * the page then.
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
 * - If the status is `'unauthenticated'`, renders nothing and redirects to
 *   `loginPath` (replacing the entry), carrying the attempted location in
 *   `state.from` for post-login restoration. On `loginPath` itself it renders
 *   its children instead, so a guard that wraps the whole route tree (login
 *   page included) does not redirect in a loop.
 * - Otherwise renders `children` (or `<RoutedView />` if none).
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
  const { t } = useTranslation()
  const { status, isAuthenticated } = useAuth()
  const { location, navigate } = useRouter()

  const loginPath = (): string => props.loginPath ?? '/login'
  // On the login path itself the guard renders its children: a guard wrapping
  // the whole route tree contains the login page.
  const redirecting = (): boolean =>
    status() === 'unauthenticated' && location().pathname !== loginPathname(loginPath())

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
        if (redirecting()) navigate(loginPath(), { replace: true, state: { from: location() } })
      },
    ),
  )

  // Read the status through a `Show`, not an `if`: a Solid component body runs
  // once, and a full-load client starts at `'loading'` and reaches its decision a
  // request later. React re-renders the guard on every `useAuth()` change, so the
  // loading tag must give way to the children in the same mount.
  return (
    <Show
      when={status() !== 'loading'}
      fallback={
        props.loadingFallback ?? (
          <div data-mol-id="auth-guard-loading">
            {t(
              props.loadingKey ?? 'common.loading',
              {},
              { defaultValue: props.loadingDefault ?? 'Loading...' },
            )}
          </div>
        )
      }
    >
      {/* Nothing while redirecting, as React renders its redirect: a redirect that cannot land
          (a guard refusing the login path) must not show the protected page. */}
      <Show when={!redirecting()}>{props.children ?? <RoutedView />}</Show>
    </Show>
  )
}
