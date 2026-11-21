/**
 * A reactive props bag a test mounts a lightbox with, so a later write
 * re-renders it the way React's next render would.
 *
 * @module
 */

import type { PhotoLightboxProps } from '../types.js'

/** One mount's {@link PhotoLightbox} props, held in Svelte state so writes reach the component. */
export class PropBag {
  /** The props the component reads. */
  props = $state<PhotoLightboxProps>({ photos: [], open: false, onClose: () => {} })

  /**
   * Creates a bag with the first render's props.
   *
   * @param initial - The initial props.
   */
  constructor(initial: PhotoLightboxProps) {
    this.props = { ...initial }
  }

  /**
   * Merges props over the current ones.
   *
   * @param next - The props to write.
   */
  set(next: Partial<PhotoLightboxProps>): void {
    this.props = { ...this.props, ...next }
  }
}
