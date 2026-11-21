<!--
  An app root as an app writes it: the page inside `AuthProvider` (`kind="auth"`) or
  `MoleculeProvider` (`kind="molecule"`), with no `awaitSession`, so the provider's own default
  decides whether the page waits for the session.
-->
<script lang="ts" generics="Props extends Record<string, unknown>">
  import type { Component } from 'svelte'

  import type { AuthClient, UserProfile } from '@molecule/app-auth'

  import { AuthProvider, MoleculeProvider } from '../../providers/index.js'
  import type { MoleculeConfig } from '../../types.js'

  let {
    kind,
    client,
    services = {},
    component: Page,
    props,
    fallback,
  }: {
    kind: 'auth' | 'molecule'
    client: AuthClient<UserProfile>
    /** The other services `MoleculeProvider` is given. */
    services?: MoleculeConfig
    component: Component<Props>
    props: Props
    /** The `sessionFallback` text, if any. */
    fallback?: string
  } = $props()
</script>

{#snippet sessionFallback()}
  {#if fallback}<p>{fallback}</p>{/if}
{/snippet}

{#if kind === 'auth'}
  <AuthProvider {client} {sessionFallback}><Page {...props} /></AuthProvider>
{:else}
  <MoleculeProvider {...services} auth={client} {sessionFallback}
    ><Page {...props} /></MoleculeProvider
  >
{/if}
