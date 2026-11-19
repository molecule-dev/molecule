<!--
  Test host for the AuthGuard suites: wires the real molecule Svelte context
  (auth client, router, i18n), renders the guard around a page chosen from the
  current pathname the way a route tree does, and exposes the live session
  state beside it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { MoleculeConfig } from '@molecule/app-svelte'
  import { setMoleculeContext, useAuth, useLocation } from '@molecule/app-svelte'

  import AuthGuard from '../components/AuthGuard.svelte'

  let {
    auth,
    router,
    i18n,
    loginPath,
    loginLabel = 'login page',
    signinLabel = 'signin page',
    protectedLabel = 'protected page',
    privateLabel = 'Protected section',
  }: {
    auth: NonNullable<MoleculeConfig['auth']>
    router: NonNullable<MoleculeConfig['router']>
    i18n: NonNullable<MoleculeConfig['i18n']>
    loginPath?: string
    loginLabel?: string
    signinLabel?: string
    protectedLabel?: string
    privateLabel?: string
  } = $props()

  // The harness's services are fixed for the host's whole life (a context is
  // read once during init), so the initial props are the ones to wire.
  untrack(() => setMoleculeContext({ auth, router, i18n }))
  const location = useLocation()
  const { status, isAuthenticated, user } = useAuth()
</script>

<AuthGuard {loginPath}>
  {#if $location.pathname === '/login'}
    <p>{loginLabel}</p>
  {:else if $location.pathname === '/signin'}
    <p>{signinLabel}</p>
  {:else if $location.pathname === '/private'}
    <p>{privateLabel}</p>
  {:else}
    <p>{protectedLabel}</p>
  {/if}
</AuthGuard>
<output data-testid="auth-state"
  >{JSON.stringify({
    status: $status,
    isAuthenticated: $isAuthenticated,
    user: $user,
  })}</output
>
<p data-testid="where">{$location.pathname}</p>
