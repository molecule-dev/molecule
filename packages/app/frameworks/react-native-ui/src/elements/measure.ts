/**
 * Measuring an element's box.
 *
 * @module
 */

import type { NativeMethods, ScrollView } from 'react-native'

import type { ElementBox, ElementHandle, ElementMeasureTarget } from '@molecule/app-ui'

type MeasurableHost = ElementHandle | Pick<NativeMethods, 'measureInWindow'> | ScrollView

/**
 * An element's box in the window, from the host view's `measureInWindow`.
 * A native scroll view is measured through its underlying host.
 *
 * @param handle - The element, from its `ref`.
 * @returns Its box.
 * @throws {TypeError} When the handle is not a rendered host view.
 */
export function measureElement(handle: MeasurableHost): Promise<ElementBox>
/**
 * Receives viewport bounds from the host. On web the callback runs during the original event.
 *
 * @param handle - The element, from its `ref`.
 * @param onMeasure - Receives the element's box.
 * @param target - A device measures the registered host in either mode.
 */
export function measureElement(
  handle: MeasurableHost,
  onMeasure: (box: ElementBox) => void,
  target?: ElementMeasureTarget,
): void
export function measureElement(
  handle: MeasurableHost,
  onMeasure?: (box: ElementBox) => void,
): Promise<ElementBox> | void {
  if (onMeasure) return measureHost(handle, onMeasure)
  return new Promise((resolve) => measureHost(handle, resolve))
}

/** Delegates measurement to the rendered view or the scroll view's underlying host. */
function measureHost(handle: MeasurableHost, onMeasure: (box: ElementBox) => void): void {
  // RN 0.79 exposes this method on ScrollView at runtime but omits it from ScrollView.d.ts.
  const host: unknown =
    'getNativeScrollRef' in handle && typeof handle.getNativeScrollRef === 'function'
      ? handle.getNativeScrollRef()
      : handle
  if (
    typeof host !== 'object' ||
    host === null ||
    !('measureInWindow' in host) ||
    typeof host.measureInWindow !== 'function'
  ) {
    throw new TypeError('measureElement: not a rendered view')
  }
  host.measureInWindow((x: number, y: number, width: number, height: number) =>
    onMeasure({ x, y, width, height }),
  )
}
