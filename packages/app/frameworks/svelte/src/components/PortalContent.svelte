<!--
  The root a `BodyPortal` mounts in its target: the portal's children and nothing
  else, so the target receives exactly the nodes the declaring component rendered
  (React's `createPortal(children, target)` renders no wrapper either).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

{@render children?.()}
