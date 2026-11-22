<!--
  Test host for ResizeHandle: renders the handle from a props object the test
  can replace, the way React's `rerender` hands the handle a new `value`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import ResizeHandle from '../components/ResizeHandle.svelte'

  /** The handle's props (React's names). */
  interface HandleProps {
    value: number
    onResize: (delta: number) => void
  }

  let { initial }: { initial: HandleProps } = $props()

  // The handle's current props (a test replaces them wholesale).
  let handleProps = $state<HandleProps>({ ...untrack(() => initial) })

  /**
   * Replaces the handle's props (the host re-rendered with new values).
   *
   * @param next - The handle's new props.
   */
  export function setProps(next: HandleProps): void {
    handleProps = next
  }
</script>

<ResizeHandle value={handleProps.value} onResize={handleProps.onResize} />
