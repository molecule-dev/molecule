<!--
  Test host for ContextSessionUsage: sets the HTTP client in Svelte context
  during component initialisation (the only place Svelte context is legal)
  and renders the rows with the props it was given. The React reference wraps
  its rows in an HttpProvider the same way.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext } from '@molecule/app-svelte'

  import type { ContextSessionUsageProps } from '../hooks/useContextSessionUsage.js'
  import ContextSessionUsage from '../parts/ContextSessionUsage.svelte'

  let { http, ...rest }: ContextSessionUsageProps & { http: HttpClient } = $props()
  // The client is fixed for the whole mount; untrack records that the host
  // reads it once, the way the conformance kit's own host does.
  untrack(() => setHttpContext(http))
</script>

<ContextSessionUsage {...rest} />
