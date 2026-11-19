<!-- The feed page, its code arriving only when the test lets it. -->
<script lang="ts">
  import Fallback from '../../../lib/Fallback.svelte'
  import Feed from '../../../lib/Feed.svelte'
  import { pageArrived } from '../../../lib/lazy.js'

  const arrived = pageArrived('feed')
</script>

{#if $arrived}
  <Feed />
{:else}
  <Fallback />
{/if}
