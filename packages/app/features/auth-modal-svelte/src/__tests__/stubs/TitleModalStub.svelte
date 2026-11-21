<!--
  Test stub for the Modal UI component that EXPOSES the title: renders the
  `title` prop on a `[data-mol-title]` heading (the marker React's locale
  suite reads) together with the content, only while open.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    open?: boolean
    onClose?: (event?: unknown) => void
    title?: string
    children?: Snippet
    [key: string]: unknown
  }

  let { open, onClose: _onClose, title, children, ...rest }: Props = $props()
</script>

{#if open}
  <div data-modal="" {...rest}>
    <h2 data-mol-title="">{title}</h2>
    {@render children?.()}
  </div>
{/if}
