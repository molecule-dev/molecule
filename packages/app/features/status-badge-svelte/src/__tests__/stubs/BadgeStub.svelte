<!--
  Test stub for the Badge UI component: the same `<span data-badge
  data-color>` marker the React unit tests install for
  `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, color, className }: { children?: Snippet; color?: string; className?: string } =
    $props()
</script>

<span data-badge="" data-color={color} class={className}>{@render children?.()}</span>
