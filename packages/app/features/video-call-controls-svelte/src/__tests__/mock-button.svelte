<!--
  Stand-in for `@molecule/app-ui-svelte`'s `Button` in the unit tests: renders
  the marker attribute and forwards `aria-pressed`, the same observable
  contract the React suite's `Button` mock has.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, 'aria-pressed': ariaPressed }: { children?: Snippet; 'aria-pressed'?: boolean } =
    $props()
</script>

<button data-button="" aria-pressed={ariaPressed}>
  {@render children?.()}
</button>
