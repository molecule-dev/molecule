<!--
  The case's routed view: renders the text the host put in context (`routedView`), as the view a
  routing bond provides renders the matched child route.
-->
<script lang="ts">
  import { getContext } from 'svelte'

  import { ROUTED_TEXT_KEY } from './routed-text.js'

  const text = getContext<string>(ROUTED_TEXT_KEY)
</script>

{text}
