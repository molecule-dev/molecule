<!--
  Test stub for the Button UI component: the same `<button data-button>` the
  React unit tests install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    variant,
    size,
    onClick,
  }: {
    children?: Snippet
    variant?: string
    size?: string
    onClick?: () => void
  } = $props()
</script>

<button data-button="" type="button" data-variant={variant} data-size={size} onclick={onClick}>
  {@render children?.()}
</button>
