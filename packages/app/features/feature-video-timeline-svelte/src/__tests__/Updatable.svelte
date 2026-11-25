<!--
  Test host (not part of the package's output): renders the timeline with props a test can
  change afterwards, the way a parent re-renders it.
-->
<script lang="ts">
  import { type Component, flushSync } from 'svelte'

  import type { VideoTimelineProps } from '../types.js'

  let {
    component: Target,
    initial,
  }: {
    component: Component<VideoTimelineProps>
    initial: VideoTimelineProps
  } = $props()

  /** The props in effect; a new object re-renders the timeline. */
  let current = $state<VideoTimelineProps>({ ...initial })

  /**
   * Merges new props in, as a parent re-rendering would, and renders them at once.
   *
   * @param next - The props to change.
   */
  export function setProps(next: Partial<VideoTimelineProps>): void {
    current = { ...current, ...next }
    flushSync()
  }
</script>

<Target {...current} />
