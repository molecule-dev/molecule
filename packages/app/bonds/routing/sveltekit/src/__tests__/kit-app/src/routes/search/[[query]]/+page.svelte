<script lang="ts">
  // `/search/[[query]]`: an ordinary page with an optional trailing parameter —
  // the declaration a link with or without `query` is built from. It also mounts the
  // credential consumer, the app's reset/search page in React's `credential-consumption`
  // cases, which reads no token on this route and so leaves the address unchanged.
  import { page } from '$app/state'

  import ConsumedParamProbe from '../../../lib/ConsumedParamProbe.svelte'
</script>

<output>{page.params.query ?? ''}</output>
<ConsumedParamProbe />
