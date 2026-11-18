<!--
  The `Button` stub: a native <button> carrying the disabled state, the same
  marker the React suite's stub renders.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { disabled, children }: { disabled?: boolean; children?: Snippet } = $props()
</script>

<button data-button="" {disabled}>{@render children?.()}</button>
