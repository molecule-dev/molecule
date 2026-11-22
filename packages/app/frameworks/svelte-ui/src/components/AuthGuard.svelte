<!--
  AuthGuard: route-element guard for authenticated sections. While the auth
  status is loading it renders the loading tag; unauthenticated it renders
  nothing and redirects to the login path carrying the attempted location in
  state.from (unless it is already there); otherwise it renders its children,
  or RoutedView without them (the matched child route, through whichever
  routing bond the app wired). onAuthenticated fires on each transition into
  authenticated.
-->
<script lang="ts">
  import { getRouter, RoutedView, useAuth, useLocation, useTranslation } from '@molecule/app-svelte'

  import type { AuthGuardProps } from '../types.js'
  import ReactNode from './ReactNode.svelte'

  let {
    loadingFallback,
    loadingKey = 'common.loading',
    loadingDefault = 'Loading...',
    loginPath = '/login',
    onAuthenticated,
    children,
  }: AuthGuardProps = $props()

  const { state: authState } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const router = getRouter()

  let lastAuthenticated = false

  // React's effect fires on every isAuthenticated change (and once on mount).
  $effect(() => {
    const isAuthenticated = $authState.status === 'authenticated'
    void onAuthenticated
    if (isAuthenticated && !lastAuthenticated) onAuthenticated?.()
    lastAuthenticated = isAuthenticated
  })

  // React Router's Navigate: replace the entry, carrying the attempted
  // location (hash/pathname/search only; the router's own state/key are
  // React Router internals the golden drops).
  const loginPathname = (path: string): string => path.split(/[?#]/)[0] || '/'

  let navigatedFrom = ''
  $effect(() => {
    void $location.pathname
    void $location.search
    void $authState.status
    if ($authState.status !== 'unauthenticated') {
      navigatedFrom = ''
      return
    }
    if ($location.pathname === loginPathname(loginPath)) return
    const from = `${$location.pathname}|${$location.search}`
    if (from === navigatedFrom) return
    navigatedFrom = from
    router.navigate(loginPath, {
      replace: true,
      state: {
        from: {
          hash: $location.hash ?? '',
          pathname: $location.pathname,
          search: $location.search ?? '',
        },
      },
    })
  })
</script>

{#if $authState.status === 'loading'}
  {#if loadingFallback}
    <ReactNode node={loadingFallback} />
  {:else}
    <div data-mol-id="auth-guard-loading">
      {t(loadingKey, {}, { defaultValue: loadingDefault })}
    </div>
  {/if}
{:else if $authState.status === 'unauthenticated' && $location.pathname !== loginPathname(loginPath)}
  <!-- Nothing while redirecting, as React renders its redirect: a redirect that
       cannot land (a guard refusing the login path) must not show the protected page. -->
{:else if children}
  {@render children()}
{:else}
  <RoutedView />
{/if}
