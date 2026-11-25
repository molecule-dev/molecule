import { useEffect } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

/**
 * Runs a zoom step for Ctrl-wheel over a surface, leaving other wheel events to the browser.
 *
 * @param ref - The existing surface.
 * @param onStep - Called with the direction of a handled wheel step. Native has no subscription.
 */
export function useWheelZoomShortcut(
  ref: { readonly current: ElementHandle | null },
  onStep?: (direction: 'in' | 'out') => void,
): void {
  useEffect(() => {
    const host = ref.current
    if (!host || !onStep) return
    const element: ElementHandle & Partial<EventTarget> = host
    if (!element.addEventListener || !element.removeEventListener) return
    const wheel = (event: Event): void => {
      if (!('ctrlKey' in event) || !event.ctrlKey || !('deltaY' in event)) return
      const delta = event.deltaY
      if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return
      event.preventDefault()
      onStep(delta < 0 ? 'in' : 'out')
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener?.('wheel', wheel)
  })
}
