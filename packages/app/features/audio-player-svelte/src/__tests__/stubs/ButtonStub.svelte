<!--
  Test stub for the Button UI component: the same `<button data-button>`
  wrapper, forwarding the pass-through attributes the React unit tests' Button
  mock forwards (`aria-label`, `data-mol-id`) and its click handler.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    onClick,
    'aria-label': ariaLabel,
    'data-mol-id': dataMolId,
  }: {
    children?: Snippet
    onClick?: () => void
    'aria-label'?: string
    'data-mol-id'?: string
  } = $props()
</script>

<button data-button="" aria-label={ariaLabel} data-mol-id={dataMolId} onclick={() => onClick?.()}
  >{@render children?.()}</button
>
