<!--
  Hold rendering until the auth client has decided the session: the children
  once `useAuth().status` has left 'loading', the fallback until then. React's
  SessionReady component, as a Svelte component with children/fallback
  snippets.
-->
<script lang="ts">
  import { useAuth } from '../hooks/useAuth.js'
  import type { SessionReadyProps } from '../types.js'

  let { children, fallback }: SessionReadyProps = $props()

  const { status } = useAuth()
</script>

{#if $status === 'loading'}
  {@render fallback?.()}
{:else}
  {@render children?.()}
{/if}
