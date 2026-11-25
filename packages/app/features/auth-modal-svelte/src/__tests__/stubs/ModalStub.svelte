<!--
  Test stub for the Modal UI component: renders its content in a
  `<div data-modal>` only while `open`, the same marker the React unit tests
  install for `@molecule/app-ui-react`. Its `data-*`/`aria-*` rest props spread
  onto that div, the real `Modal`'s passthrough contract.
-->
<script lang="ts">
  import { type Snippet, untrack } from 'svelte'

  import type { OverlayTarget } from '@molecule/app-ui'

  interface Props {
    open?: boolean
    onClose?: (event?: unknown) => void
    title?: string
    initialFocus?: OverlayTarget
    children?: Snippet
    [key: string]: unknown
  }

  let { open, onClose: _onClose, title: _title, initialFocus, children, ...rest }: Props = $props()

  $effect(() => {
    if (open) untrack(() => initialFocus?.current?.focus())
  })
</script>

{#if open}
  <div data-modal="" data-initial-focus={initialFocus ? 'true' : undefined} {...rest}>
    {@render children?.()}
  </div>
{/if}
