<!--
  Test stub for the Modal UI component: renders its content in a
  `<div data-modal>` only while `open`, the same marker the React unit tests
  install for `@molecule/app-ui-react`. Its `data-*`/`aria-*` rest props spread
  onto that div, the real `Modal`'s passthrough contract.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    open?: boolean
    onClose?: (event?: unknown) => void
    children?: Snippet
    [key: string]: unknown
  }

  let { open, onClose: _onClose, children, ...rest }: Props = $props()
</script>

{#if open}
  <div data-modal="" {...rest}>{@render children?.()}</div>
{/if}
