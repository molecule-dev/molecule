import { useEffect } from 'react'

import { bindWebWheelZoom, type WebWheelZoomHandler } from '@molecule/app-pointer-events-dom'
import type { ElementHandle } from '@molecule/app-ui'

/**
 * Runs a zoom step for Ctrl-wheel over a surface, leaving other wheel events to the browser.
 *
 * @param ref - The existing surface.
 * @param onStep - Called with the direction of a handled wheel step. Native has no subscription.
 */
export function useWheelZoomShortcut(
  ref: { readonly current: ElementHandle | null },
  onStep?: WebWheelZoomHandler,
): void {
  useEffect(() => {
    const host = ref.current
    if (!host || !onStep) return
    const element: ElementHandle & Partial<EventTarget> = host
    return bindWebWheelZoom(element, onStep).destroy
  })
}
