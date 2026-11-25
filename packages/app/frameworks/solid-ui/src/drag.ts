import { type Accessor, createRenderEffect, onCleanup } from 'solid-js'

import { bindWebDrag } from '@molecule/app-pointer-events-dom'
import type { ElementDrag } from '@molecule/app-ui'

/**
 * Bind the web kits' shared drag gesture from a Solid ref callback. Use
 * `ref={(host) => webDrag(host, () => handlers())}` on an HTML or SVG element.
 * Return undefined from the accessor to disable the gesture.
 *
 * @param host - The element that owns the gesture.
 * @param drag - Reads the current handlers.
 */
export function webDrag(
  host: HTMLElement | SVGElement,
  drag: Accessor<ElementDrag | undefined>,
): void {
  const binding = bindWebDrag(host)
  createRenderEffect(() => binding.update(drag()))
  onCleanup(binding.destroy)
}
