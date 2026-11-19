/**
 * A reactive props bag a test mounts a component with, so a later write
 * re-renders it the way React's next render would.
 *
 * @module
 */

import type { TransportBarProps } from '../types.js'

/** One mount's props, held in Svelte state so writes reach the component. */
export class PropBag {
  /** The props the component reads. */
  props = $state<TransportBarProps>({
    isPlaying: false,
    onPlayToggle: () => {},
    onStop: () => {},
  })

  /**
   * Creates a bag with the first render's props.
   *
   * @param initial - The initial props, merged over the bar's defaults.
   */
  constructor(initial: Partial<TransportBarProps> = {}) {
    this.props = { ...this.props, ...initial }
  }

  /**
   * Merges props over the current ones.
   *
   * @param next - The props to write.
   */
  set(next: Partial<TransportBarProps>): void {
    this.props = { ...this.props, ...next }
  }
}
