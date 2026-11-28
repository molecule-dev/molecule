import { type MouseEvent, type PointerEvent, useState } from 'react'

import { createWebHover } from '@molecule/app-pointer-events-dom'
import type { InteractionProps } from '@molecule/app-ui'

/** Routes React's synthetic hover events through the shared transition. */
export function useWebHover<T extends Element>({
  onMouseEnter,
  onMouseLeave,
}: Pick<InteractionProps, 'onMouseEnter' | 'onMouseLeave'>): {
  onPointerEnter?: (event: PointerEvent<T>) => void
  onPointerLeave?: (event: PointerEvent<T>) => void
  onMouseEnter?: (event: MouseEvent<T>) => void
  onMouseLeave?: (event: MouseEvent<T>) => void
} {
  const [transition] = useState(createWebHover)
  if (!onMouseEnter && !onMouseLeave) return {}
  const enter = (event: MouseEvent<T>): void => {
    if (transition(true, event)) onMouseEnter?.(event)
  }
  const leave = (event: MouseEvent<T>): void => {
    if (transition(false, event)) onMouseLeave?.(event)
  }
  return {
    onPointerEnter: enter,
    onPointerLeave: leave,
    onMouseEnter: enter,
    onMouseLeave: leave,
  }
}
