import { type MouseEvent, type PointerEvent, useRef } from 'react'

import type { InteractionProps } from '@molecule/app-ui'

/** Routes both browser hover streams through the same enter/leave transition. */
export function useWebHover<T extends Element>({
  onMouseEnter,
  onMouseLeave,
}: Pick<InteractionProps, 'onMouseEnter' | 'onMouseLeave'>): {
  onPointerEnter?: (event: PointerEvent<T>) => void
  onPointerLeave?: (event: PointerEvent<T>) => void
  onMouseEnter?: (event: MouseEvent<T>) => void
  onMouseLeave?: (event: MouseEvent<T>) => void
} {
  const inside = useRef(false)
  const fromTouch = useRef(false)
  if (!onMouseEnter && !onMouseLeave) return {}
  const transition = (entered: boolean, event: MouseEvent<T> | PointerEvent<T>): void => {
    if ('pointerType' in event) {
      fromTouch.current = event.pointerType === 'touch'
      if (fromTouch.current) return
    } else if (fromTouch.current) {
      // A compatibility mouse entry after a touch is not a hover. A real pointer entry clears it.
      return
    }
    if (inside.current === entered) return
    inside.current = entered
    if (entered) onMouseEnter?.(event)
    else onMouseLeave?.(event)
  }
  return {
    onPointerEnter: (event) => transition(true, event),
    onPointerLeave: (event) => transition(false, event),
    onMouseEnter: (event) => transition(true, event),
    onMouseLeave: (event) => transition(false, event),
  }
}
