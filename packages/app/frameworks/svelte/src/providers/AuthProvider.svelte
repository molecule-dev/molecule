<!--
  Provider for authentication, as @molecule/app-react's AuthProvider: it provides the client
  and, unless `awaitSession` is false, renders its children only once the session is decided
  (SessionReady), with `sessionFallback` meanwhile.
-->
<script lang="ts">
  import { SessionReady } from '../session-ready/index.js'
  import type { AuthProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { client, awaitSession = true, sessionFallback, children }: AuthProviderProps = $props()
</script>

{#key client}
  <Provided services={{ auth: client }}>
    {#if awaitSession}
      <SessionReady fallback={sessionFallback}>
        {@render children?.()}
      </SessionReady>
    {:else}
      {@render children?.()}
    {/if}
  </Provided>
{/key}
