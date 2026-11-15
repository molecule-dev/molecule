<!--
  Test stub for the Button UI component: the same `<button data-button>` the
  React unit tests install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    disabled,
    onClick,
  }: {
    children?: Snippet
    disabled?: boolean
    onClick?: (event: MouseEvent) => void
  } = $props()
</script>

<button data-button="" type="button" {disabled} onclick={onClick}>
  {@render children?.()}
</button>
