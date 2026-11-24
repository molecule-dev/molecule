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
export async function measureElement(handle: ElementHandle): Promise<ElementBox> {
  if (!(handle instanceof Element)) throw new TypeError('measureElement: not a rendered element')
  const { x, y, width, height } = handle.getBoundingClientRect()
  return { x, y, width, height }
}
