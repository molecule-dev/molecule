/**
 * Measuring an element's box.
 *
 * @module
 */

import type { ElementBox, ElementHandle } from '@molecule/app-ui'

/**
 * An element's box in the window. On the web it reads `getBoundingClientRect()`; on React Native
 * the native kit's `measureElement` reads `measureInWindow`.
 *
 * @param handle - The element, from its `ref`.
 * @returns Its box.
 * @throws {TypeError} When the handle is not a rendered DOM element.
 */
export function measureElement(handle: ElementHandle): Promise<ElementBox>
/**
 * Delivers the viewport bounds during the browser event. On native the host delivers them when
 * measured. Use this form when a browser callback must run during the original interaction.
 *
 * @param handle - The element, from its `ref`.
 * @param onMeasure - Receives the element's box.
 */
export function measureElement(handle: ElementHandle, onMeasure: (box: ElementBox) => void): void
export function measureElement(
  handle: ElementHandle,
  onMeasure?: (box: ElementBox) => void,
): Promise<ElementBox> | void {
  if (onMeasure) return onMeasure(elementBox(handle))
  return new Promise((resolve) => resolve(elementBox(handle)))
}

/** Reads the rendered element's viewport box. */
function elementBox(handle: ElementHandle): ElementBox {
  if (!(handle instanceof Element)) throw new TypeError('measureElement: not a rendered element')
  const { x, y, width, height } = handle.getBoundingClientRect()
  return { x, y, width, height }
}
