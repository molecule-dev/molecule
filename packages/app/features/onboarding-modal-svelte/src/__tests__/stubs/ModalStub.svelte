<!--
  Test stub for the Modal UI component: renders its content in a
  `<div data-modal>` only while `open`, the same marker the React unit tests
  install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open,
    onClose: _onClose,
    children,
  }: { open?: boolean; onClose?: (event?: unknown) => void; children?: Snippet } = $props()
</script>

{#if open}
  <div data-modal="">{@render children?.()}</div>
{/if}
