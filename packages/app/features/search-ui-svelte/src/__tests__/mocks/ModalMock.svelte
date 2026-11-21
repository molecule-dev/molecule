<!--
  The Modal mock the unit tests substitute for `@molecule/app-ui-svelte`'s
  `Modal`: the same element the React tests' mock renders — a dialog role
  holding its children while open, nothing while closed. It forwards
  `aria-label` onto the dialog, as the real Modal moves `aria-*` there.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open,
    'aria-label': ariaLabel,
    children,
  }: { open: boolean; 'aria-label'?: string; children?: Snippet } = $props()
</script>

{#if open}
  <div role="dialog" aria-label={ariaLabel}>{@render children?.()}</div>
{/if}
