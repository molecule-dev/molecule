<!-- The article page, its code arriving only when the test lets it. -->
<script lang="ts">
  import Article from '../../../../lib/Article.svelte'
  import Fallback from '../../../../lib/Fallback.svelte'
  import { pageArrived } from '../../../../lib/lazy.js'

  const arrived = pageArrived('article')
</script>

{#if $arrived}
  <Article />
{:else}
  <Fallback />
{/if}
