/**
 * Vue AuthGuard UI component — route-element guard for authenticated
 * sections, faithful port of `@molecule/app-ui-react`'s AuthGuard.
 *
 * While `useAuth().status` is `'loading'` it renders the `loadingFallback`
 * (or the default loading tag); when `'unauthenticated'` it redirects to
 * `loginPath` carrying the attempted location in `state.from`; otherwise it
 * renders its children (the default slot).
 *
 * @module
 */

import { defineComponent, h, onMounted, type PropType, ref, type VNode, watch } from 'vue'

import { useAuth } from '../hooks/useAuth.js'
import { useLocation, useMoleculeRouter } from '../hooks/useRouter.js'
import { useTranslation } from '../hooks/useTranslation.js'

/**
 * The pathname part of a login path (`/login?next=x` → `/login`).
 *
 * @param loginPath - The guard's `loginPath`.
 * @returns Its pathname.
 */
const loginPathname = (loginPath: string): string => loginPath.split(/[?#]/)[0] || '/'

/**
 * Vue AuthGuard UI component.
 *
 * Route-element guard for authenticated sections of the app tree.
 *
 * - While `useAuth().status` is `'loading'` (no session decision yet), renders the
 *   `loadingFallback` (or the default `<div data-mol-id="auth-guard-loading">{t('common.loading')}</div>`).
 * - If the status is `'unauthenticated'`, redirects to `loginPath` carrying
 *   the attempted location in `state.from` for post-login restoration. On
 *   `loginPath` itself it renders its children instead, so a guard that wraps
 *   the whole route tree (login page included) does not redirect in a loop.
 * - Otherwise renders its children (the default slot). React defaults to
 *   `<Outlet />` when children are absent, which renders nothing outside a
 *   routed parent — so this renders the default slot or nothing.
 *
 * The guard reads `status`, not `initialized`: a stored token AND user make the
 * FIRST render `'authenticated'`, so a protected page paints immediately instead
 * of waiting for the background verification (`validateSession()`) or a
 * current-user round trip. `'unavailable'` (a retained candidate the server could
 * not confirm) still renders the page and lets the API decide. It is not a
 * confirmed-session boolean: `isAuthenticated` can be false and `user` can be null
 * while a token/cookie-only candidate is unavailable, so never redirect on the
 * boolean or require a profile in this state.
 *
 * The default loading tag carries `data-mol-id="auth-guard-loading"`
 * so AI agents and e2e tests can target it reliably. When the caller
 * passes a custom `loadingFallback`, it's the caller's responsibility
 * to include any data-mol-id they need.
 *
 * The `onAuthenticated` callback (the `authenticated` emit) fires on each
 * `false` → `true` transition of `isAuthenticated`, including already being
 * `true` on first mount.
 *
 * @param props - Loading fallback overrides, `loginPath`, and the guarded children.
 * @returns The loading fallback, nothing while redirecting, or the children.
 */
export const AuthGuard = defineComponent({
  name: 'MAuthGuard',
  inheritAttrs: false,
  props: {
    /**
     * Node rendered while `useAuth().status` is `'loading'` — no session
     * decision yet. Arrives as the `loadingFallback` prop or the
     * `loadingFallback` slot. Overrides the default
     * `<div data-mol-id="auth-guard-loading">…</div>` loading tag — pass a
     * full-page spinner or any other UI you want during the auth bootstrap
     * window.
     */
    // `null` (Vue's "no runtime type validation" declaration) typed as the
    // React `ReactNode` shape — TS requires the `unknown` step here because
    // `null` does not overlap `VNode` structurally.
    loadingFallback: null as unknown as PropType<VNode | VNode[]>,
    /**
     * i18n key used for the default loading-tag text. Defaults to
     * `'common.loading'`. Ignored when `loadingFallback` is set.
     */
    loadingKey: {
      type: String,
      default: 'common.loading',
    },
    /**
     * Fallback text if the i18n key is missing. Defaults to `'Loading...'`
     * (the project-canonical ASCII glyph — Phase C of the locale
     * canonicalization plan). Ignored when `loadingFallback` is set.
     */
    loadingDefault: {
      type: String,
      default: 'Loading...',
    },
    /**
     * Path to redirect to when `useAuth().status` is `'unauthenticated'`.
     * Defaults to `'/login'`. The current location is preserved as
     * `state.from` for post-login restoration.
     */
    loginPath: {
      type: String,
      default: '/login',
    },
  },
  emits: ['authenticated'],
  setup(props, { slots, emit }) {
    const { isAuthenticated, status } = useAuth()
    const { t } = useTranslation()
    const location = useLocation()
    const router = useMoleculeRouter()

    // React's effect fires on mount and on every `isAuthenticated` change:
    // the callback runs on each false → true transition (including already
    // true on first mount), tracked through the last-value ref.
    const lastAuthenticated = ref(false)
    watch(
      isAuthenticated,
      (value) => {
        if (value && !lastAuthenticated.value) {
          emit('authenticated')
        }
        lastAuthenticated.value = value
      },
      { immediate: true },
    )

    // React Router's <Navigate to={loginPath} state={{ from: location }} replace />:
    // replaces the current entry with the login path, carrying the attempted
    // location as `state.from`. Runs on mount and whenever the auth status or
    // the location changes; once the entry is the login path itself the guard
    // renders its children instead, so this never loops.
    const redirectIfNeeded = (): void => {
      if (status.value !== 'unauthenticated') return
      if (location.value.pathname === loginPathname(props.loginPath)) return
      router.navigate(props.loginPath, {
        replace: true,
        state: { from: { ...location.value } },
      })
    }
    watch(
      () => [
        status.value,
        location.value.pathname,
        location.value.search,
        location.value.hash,
        props.loginPath,
      ],
      redirectIfNeeded,
    )
    onMounted(redirectIfNeeded)

    return () => {
      if (status.value === 'loading') {
        const fallback = props.loadingFallback ?? slots.loadingFallback?.()
        return (
          fallback ??
          h(
            'div',
            { 'data-mol-id': 'auth-guard-loading' },
            t(props.loadingKey, {}, { defaultValue: props.loadingDefault }),
          )
        )
      }
      if (
        status.value === 'unauthenticated' &&
        location.value.pathname !== loginPathname(props.loginPath)
      ) {
        // React renders <Navigate> here (nothing) while the effect above
        // performs the redirect; once the router lands on the login path
        // this branch stops matching and the children render.
        return null
      }
      return slots.default?.() ?? null
    }
  },
})
