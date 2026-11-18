<!--
  Test stub for the Button UI component: the same `<button data-button>`
  wrapper carrying its children, its click handler and the details-list ARIA
  state, that the React unit tests install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    onClick,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
  }: {
    children?: Snippet
    onClick?: () => void
    'aria-expanded'?: boolean
    'aria-controls'?: string
  } = $props()
</script>

<button data-button="" onclick={onClick} aria-expanded={ariaExpanded} aria-controls={ariaControls}>
  {@render children?.()}
</button>
