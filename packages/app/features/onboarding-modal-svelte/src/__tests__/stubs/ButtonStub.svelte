<!--
  Test stub for the Button UI component: the same `<button data-button>` the
  React unit tests install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<button data-button="">{@render children?.()}</button>
