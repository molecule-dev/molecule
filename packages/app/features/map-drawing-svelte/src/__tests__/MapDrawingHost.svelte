<!--
  Test host: renders the MapDrawing from a reactive prop bag, so a test can
  change a prop the way React's rerender hands down new props.
-->
<script lang="ts">
  import MapDrawing from '../MapDrawing.svelte'
  import type { PropBag } from './props-bag.svelte.js'

  let { bag }: { bag: PropBag } = $props()
</script>

<MapDrawing {...bag.props} />
