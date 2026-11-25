import type { Action } from 'svelte/action'

import { bindWebWheelZoom, type WebWheelZoomHandler } from '@molecule/app-pointer-events-dom'

/**
 * Use `use:webWheelZoom={onStep}` on a surface to handle shared Ctrl-wheel zoom steps.
 * Pass undefined to leave the wheel to the browser.
 */
export const webWheelZoom: Action<HTMLElement | SVGElement, WebWheelZoomHandler | undefined> =
  bindWebWheelZoom
