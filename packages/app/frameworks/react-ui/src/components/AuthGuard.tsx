import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth, useTranslation } from '@molecule/app-react'

/**
 * Route-element guard for authenticated sections of a React Router tree.
 *
 * - While auth state is still initializing, renders a tiny loading tag
 *   (i18n key `common.loading`, default `"Loading…"`).
 * - If the user is not authenticated, redirects to `/login` carrying the
 *   attempted location in `state.from` for post-login restoration.
 * - Otherwise renders the nested `<Outlet/>`.
 *
 * Relies on `useAuth()` / `useTranslation()` from the wired
 * `@molecule/app-react` bindings.
 */
export function AuthGuard() {
  const { isAuthenticated, state } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  if (!state.initialized) return <div>{t('common.loading', {}, { defaultValue: 'Loading…' })}</div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
