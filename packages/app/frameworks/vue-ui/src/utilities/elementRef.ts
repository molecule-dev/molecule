/**
 * Element-ref utilities for UI components.
 *
 * @module
 */

import { type SetupContext, type ShallowRef, shallowRef } from 'vue'

/**
 * The ref for a component's ref element; a caller's template ref on the
 * component reads it as `$el`.
 *
 * @param expose - The component's `setup` context `expose`.
 * @returns The ref the component puts on its ref element (React's `forwardRef`
 *   target); it holds `null` while that element is not rendered.
 */
export function useElementRef<E extends Element>(
  expose: SetupContext['expose'],
): ShallowRef<E | null> {
  const element: ShallowRef<E | null> = shallowRef<E | null>(null)
  expose({ $el: element })
  return element
}
