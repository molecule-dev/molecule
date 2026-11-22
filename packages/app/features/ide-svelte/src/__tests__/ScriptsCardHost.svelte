<!--
  Test host for ScriptsCard: sets the http provider in Svelte context during
  component initialisation (the only place Svelte context is legal) and
  renders the card with the props it was given. The React reference wraps its
  card in an HttpProvider the same way; the i18n provider is process-global.
-->
<script lang="ts">
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext } from '@molecule/app-svelte'

  import ScriptsCard, { type ScriptsCardProps } from '../parts/ScriptsCard.svelte'

  let { http, ...rest }: ScriptsCardProps & { http: HttpClient } = $props()
  // svelte-ignore state_referenced_locally
  setHttpContext(http)
</script>

<ScriptsCard {...rest} />
