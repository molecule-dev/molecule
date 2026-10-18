import { type ReactNode, useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'

/**
 * Props for {@link AuthGuard}.
 *
 * All props are optional — the default behavior (loading tag → redirect
 * to `/login` → `<Outlet />`) matches the bare-bones guard apps were
 * shipping locally. The props let apps customize per-call without
 * forking the component.
 */
export interface AuthGuardProps {
  /**
   * Element rendered while `useAuth().status` is `'loading'` — no session
   * decision yet. Overrides the default
   * `<div data-mol-id="auth-guard-loading">…</div>` loading tag — pass a
   * full-page spinner or any other UI you want during the auth bootstrap window.
   */
  loadingFallback?: ReactNode
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
   * Path to redirect to when the user is not authenticated. Defaults to
   * `'/login'`. The current `useLocation()` is preserved as `state.from`
   * for post-login restoration.
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
   * Children to render when authenticated. Defaults to `<Outlet />`,
   * which is the React Router pattern this guard is designed for.
   */
  children?: ReactNode
}

/**
 * Route-element guard for authenticated sections of a React Router tree.
 *
 * - While `useAuth().status` is `'loading'` (no session decision yet), renders the
 *   `loadingFallback` (or the default `<div data-mol-id="auth-guard-loading">{t('common.loading')}</div>`).
 * - If the user is not authenticated, redirects to `loginPath` carrying
 *   the attempted location in `state.from` for post-login restoration.
 * - Otherwise renders `children` (or `<Outlet />` if none).
 *
 * The guard reads `status`, not `initialized`: a stored token AND user make the
 * FIRST render `'authenticated'`, so a protected page paints immediately instead
 * of waiting for the background verification (`validateSession()`) or a
 * current-user round trip. `'unavailable'` (a stored session the server could not
 * confirm) counts as signed in — the page renders and the API decides.
 *
 * The default loading tag carries `data-mol-id="auth-guard-loading"`
 * so AI agents and e2e tests can target it reliably. When the caller
 * passes a custom `loadingFallback`, it's the caller's responsibility
 * to include any data-mol-id they need.
 *
 * @param props - {@link AuthGuardProps}
 */
export function AuthGuard({
  loadingFallback,
  loadingKey = 'common.loading',
  loadingDefault = 'Loading...',
  loginPath = '/login',
  onAuthenticated,
  children,
}: AuthGuardProps = {}): ReactNode {
  const { isAuthenticated, status } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const lastAuthRef = useRef(false)

  useEffect(() => {
    if (!onAuthenticated) return
    if (isAuthenticated && !lastAuthRef.current) {
      onAuthenticated()
    }
    lastAuthRef.current = isAuthenticated
  }, [isAuthenticated, onAuthenticated])

  if (status === 'loading') {
    return (
      loadingFallback ?? (
        <div data-mol-id="auth-guard-loading">
          {t(loadingKey, {}, { defaultValue: loadingDefault })}
        </div>
      )
    )
  }
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }
  return <>{children ?? <Outlet />}</>
}
