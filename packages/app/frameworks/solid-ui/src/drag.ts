import { type Accessor, createRenderEffect, onCleanup } from 'solid-js'

import { bindWebDrag, type WebDragOptions } from '@molecule/app-pointer-events-dom'

/**
 * Bind the web kits' shared drag gesture from a Solid ref callback. Use
 * `ref={(host) => webDrag(host, () => handlers())}` on an HTML or SVG element.
 * The accessor returns a drag or `{ drag, zoom }`. Undefined disables the gesture.
 *
 * @param host - The element that owns the gesture.
 * @param drag - Reads the current handlers.
 */
export function webDrag(
  host: HTMLElement | SVGElement,
  drag: Accessor<WebDragOptions | undefined>,
): void {
  const binding = bindWebDrag(host)
  createRenderEffect(() => binding.update(drag()))
  onCleanup(binding.destroy)
}
