<!--
  Test stub for the Card UI component: the same `<div data-card>` wrapper
  forwarding `className` that the React unit tests install for
  `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { className, children }: { className?: string; children?: Snippet } = $props()
</script>

<div data-card class={className}>
  {@render children?.()}
</div>
