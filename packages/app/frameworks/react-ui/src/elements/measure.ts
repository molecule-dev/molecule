/**
 * Measuring an element's box.
 *
 * @module
 */

import { domElement } from '@molecule/app-overlay-dom'
import type { ElementBox, ElementHandle, ElementMeasureTarget } from '@molecule/app-ui'

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
 * @param target - Optionally measures the start of the registered element's content.
 */
export function measureElement(
  handle: ElementHandle,
  onMeasure: (box: ElementBox) => void,
  target?: ElementMeasureTarget,
): void
export function measureElement(
  handle: ElementHandle,
  onMeasure?: (box: ElementBox) => void,
  target: ElementMeasureTarget = 'frame',
): Promise<ElementBox> | void {
  if (onMeasure) return onMeasure(elementBox(handle, target))
  return new Promise((resolve) => resolve(elementBox(handle, target)))
}

/** Reads the rendered element's viewport box. */
function elementBox(handle: ElementHandle, target: ElementMeasureTarget): ElementBox {
  const element = domElement(handle)
  if (!element) throw new TypeError('measureElement: not a rendered element')
  const measured = target === 'content-start' ? (element.firstElementChild ?? element) : element
  const { x, y, width, height } = measured.getBoundingClientRect()
  return { x, y, width, height }
}
