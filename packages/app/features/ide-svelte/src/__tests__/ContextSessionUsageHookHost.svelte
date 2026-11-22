<!--
  Test host for `useContextSessionUsage`: sets the HTTP client in Svelte
  context during component initialisation, calls the hook with the readable
  sources it was given, and shows the loaded state so a test can read it —
  plus a button that calls `refresh()` the way a visible summary's host would.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext } from '@molecule/app-svelte'

  import { useContextSessionUsage } from '../hooks/useContextSessionUsage.js'

  interface Props {
    /** The HTTP client the host provides. */
    http: HttpClient
    /** The project whose chat usage to load. */
    project: Readable<string | undefined>
    /** The conversation to scope the totals to. */
    conversation: Readable<string | null | undefined>
    /** Whether the summary is visible. */
    active: Readable<boolean>
  }

  let { http, project, conversation, active }: Props = $props()
  // The client and the hook's sources are fixed for the whole mount; untrack
  // records that the host reads them once, the way the conformance kit's own
  // host does.
  const usage = untrack(() => {
    setHttpContext(http)
    return useContextSessionUsage(project, conversation, active)
  })
  const { data, loading, failed } = usage
</script>

<span
  data-usage={JSON.stringify({
    data: $data,
    loading: $loading,
    failed: $failed,
  })}
></span>
<button type="button" onclick={() => usage.refresh()}>refresh</button>
