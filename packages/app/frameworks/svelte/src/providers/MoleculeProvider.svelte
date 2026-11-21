<!--
  Combined provider for every molecule service, as @molecule/app-react's MoleculeProvider.
  Only the services passed are provided, except `state`, which falls back to the state
  provider bonded under @molecule/app-state. Given `auth`, the children render only once the
  session is decided (`awaitSession`, default true), with `sessionFallback` meanwhile.
-->
<script lang="ts">
  import { getProvider, hasProvider } from '@molecule/app-state'

  import { SessionReady } from '../session-ready/index.js'
  import type { MoleculeConfig, MoleculeProviderProps } from '../types.js'
  import Provided from './Provided.svelte'
  import { servicesKey } from './services.js'

  let {
    children,
    sessionFallback,
    awaitSession = true,
    state,
    auth,
    theme,
    router,
    i18n,
    http,
    storage,
    logger,
    chat,
    workspace,
    editor,
    preview,
  }: MoleculeProviderProps = $props()

  // A `state` prop wins; otherwise the BONDED state provider, the singleton every
  // `createStore()` reads, so `useStore()` in a scaffolded app needs no `state` prop.
  const services: MoleculeConfig = $derived({
    state: state ?? (hasProvider() ? getProvider() : undefined),
    auth,
    theme,
    router,
    i18n,
    http,
    storage,
    logger,
    chat,
    workspace,
    editor,
    preview,
  })
</script>

{#key servicesKey(services)}
  <Provided {services}>
    {#if awaitSession && auth}
      <!-- The session hold is innermost: its fallback still sees every service. -->
      <SessionReady fallback={sessionFallback}>
        {@render children?.()}
      </SessionReady>
    {:else}
      {@render children?.()}
    {/if}
  </Provided>
{/key}
