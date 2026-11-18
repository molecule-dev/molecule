/**
 * A reactive props bag a test mounts a component with, so a later write
 * re-renders it the way React's next render would.
 *
 * @module
 */

/** One mount's props, held in Svelte state so writes reach the component. */
export class PropBag {
  /** The props the component reads. */
  props = $state<Record<string, unknown>>({})

  /**
   * Creates a bag with the first render's props.
   *
   * @param initial - The initial props.
   */
  constructor(initial: Record<string, unknown>) {
    this.props = { ...initial }
  }

  /**
   * Merges props over the current ones.
   *
   * @param next - The props to write.
   */
  set(next: Record<string, unknown>): void {
    this.props = { ...this.props, ...next }
  }
}
