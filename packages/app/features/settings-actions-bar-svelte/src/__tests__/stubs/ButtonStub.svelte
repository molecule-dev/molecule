<!--
  Button stub for the unit tests: an inspectable `<button>` carrying
  `data-button` and the disabled state, the same markers the React suite's
  `@molecule/app-ui-react` stub renders.
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

<button data-button="" {disabled} onclick={onClick}>{@render children?.()}</button>
