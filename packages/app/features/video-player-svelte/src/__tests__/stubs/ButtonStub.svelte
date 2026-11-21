<!--
  Test stub for the Button UI component: the same `<button data-button>`
  wrapper, forwarding the pass-through attributes the React unit tests' Button
  mock forwards (`aria-label`) and its click handler.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children?: Snippet
    onClick?: () => void
    'aria-label'?: string
  } = $props()
</script>

<button data-button="" aria-label={ariaLabel} onclick={() => onClick?.()}
  >{@render children?.()}</button
>
