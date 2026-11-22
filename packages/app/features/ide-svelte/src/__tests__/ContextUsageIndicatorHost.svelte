<!--
  Test host for `ContextUsageIndicator`: sets the HTTP client in Svelte
  context during component initialisation (the only place Svelte context is
  legal) and renders the indicator with props from a store, so a store write
  re-renders the same mount the way React's rerender does. The React
  reference wraps its rows in an HttpProvider the same way.
-->

<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext } from '@molecule/app-svelte'

  import type { ContextUsageIndicatorProps } from '../parts/ContextUsageIndicator.svelte'
  import ContextUsageIndicator from '../parts/ContextUsageIndicator.svelte'

  interface Props {
    /** The HTTP client the host provides. */
    http: HttpClient
    /** The indicator's props, over a store so a write re-renders. */
    props: Readable<ContextUsageIndicatorProps>
  }

  let { http, props: propsSource }: Props = $props()
  // The client is fixed for the whole mount; untrack records that the host
  // reads it once, the way the conformance kit's own host does.
  untrack(() => setHttpContext(http))
  let current = $derived($propsSource)
</script>

<ContextUsageIndicator
  usage={current.usage}
  history={current.history}
  compactions={current.compactions}
  projectId={current.projectId}
  conversationId={current.conversationId}
  onOpenSettings={current.onOpenSettings}
/>
