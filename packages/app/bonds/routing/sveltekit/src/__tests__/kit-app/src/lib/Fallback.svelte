<!-- The page area's fallback while the page's code loads; counts its committed renders. -->
<script lang="ts">
  import { onMount } from 'svelte'

  import { countFallbackRender } from './lazy.js'

  onMount(countFallbackRender)
</script>

<p data-fallback="">loading</p>
