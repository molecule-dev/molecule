<!-- An app shell around the page, as React's layout `<Route element={<Shell />}>` is. -->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import RouterPath from '../../lib/RouterPath.svelte'

  const { children }: { children: Snippet } = $props()
</script>

<div>
  <nav data-shell="">shell</nav>
  <RouterPath />
  {@render children()}
</div>
