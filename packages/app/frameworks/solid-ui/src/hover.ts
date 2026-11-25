import { type Accessor, createRenderEffect, onCleanup } from 'solid-js'

import { bindWebHover, type WebHoverHandlers } from '@molecule/app-pointer-events-dom'

/**
 * Binds shared mouse and pen hover from a Solid ref. Use
 * `ref={(host) => webHover(host, () => ({ onEnter, onLeave }))}`.
 * Return undefined from the accessor to disable hover.
 *
 * @param host - The HTML or SVG element that receives hover.
 * @param handlers - Reads the current callbacks.
 */
export function webHover(
  host: HTMLElement | SVGElement,
  handlers: Accessor<WebHoverHandlers | undefined>,
): void {
  const binding = bindWebHover(host)
  createRenderEffect(() => binding.update(handlers()))
  onCleanup(binding.destroy)
}
