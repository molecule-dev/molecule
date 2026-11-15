<!--
  Test stub for the Button UI component: the same `<button data-button
  data-color>` forwarding `disabled` that the React unit tests install for
  `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, disabled, color }: { children?: Snippet; disabled?: boolean; color?: string } =
    $props()
</script>

<button data-button="" {disabled} data-color={color}>
  {@render children?.()}
</button>
