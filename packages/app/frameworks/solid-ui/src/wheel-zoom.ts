import { type Accessor, createRenderEffect, onCleanup } from 'solid-js'

import { bindWebWheelZoom, type WebWheelZoomHandler } from '@molecule/app-pointer-events-dom'

/**
 * Binds the shared Ctrl-wheel zoom step from a Solid ref. Use
 * `ref={(host) => webWheelZoom(host, () => onStep())}`. Return
 * undefined from the accessor to leave the wheel to the browser.
 *
 * @param host - The surface receiving wheel events.
 * @param onStep - Reads the current zoom callback.
 */
export function webWheelZoom(
  host: HTMLElement | SVGElement,
  onStep: Accessor<WebWheelZoomHandler | undefined>,
): void {
  const binding = bindWebWheelZoom(host)
  createRenderEffect(() => binding.update(onStep()))
  onCleanup(binding.destroy)
}
