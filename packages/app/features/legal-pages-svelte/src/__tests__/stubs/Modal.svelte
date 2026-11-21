<!--
  A stand-in for the UI `Modal` in the unit tests: renders its body
  unconditionally, so the assertions read the modal content without driving
  the open/close state — the same stub the React tests use.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open: _open,
    onClose: _onClose,
    title: _title,
    size: _size,
    children,
  }: {
    open?: boolean
    onClose?: () => void
    title?: string
    size?: string
    children?: Snippet
  } = $props()
</script>

<div data-modal="">{@render children?.()}</div>
