import { createContext, type RefObject, useCallback, useRef } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native'

import type { ElementHandle } from '@molecule/app-ui'

import { measureElement } from './measure.js'

type Reveal = (handle: ElementHandle) => void

/** Leaves elements outside a scroll area in place. */
function ignoreReveal(): void {}

/** The reveal operation for descendants of the enclosing scroll area. */
export const ScrollRevealScope = createContext<Reveal>(ignoreReveal)

/** Finds the smallest scroll distance needed to bring the element into view. */
function nearestDelta(start: number, end: number, low: number, high: number): number {
  if (start < low && end <= high) return Math.max(start - low, end - high)
  if (end > high && start >= low) return Math.min(start - low, end - high)
  return 0
}

/**
 * Tracks one native scroll viewport and reveals descendants at the nearest visible offset.
 *
 * @param horizontal - Whether this viewport scrolls horizontally.
 * @returns The scroll ref, the offset observer, and a reveal operation for its descendants.
 */
export function useScrollReveal(horizontal: boolean): {
  ref: RefObject<ScrollView | null>
  reveal: Reveal
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
} {
  const ref = useRef<ScrollView>(null)
  const offset = useRef({ x: 0, y: 0 })
  const request = useRef(0)
  const reveal = useCallback<Reveal>(
    (row) => {
      const view = ref.current
      if (!view) return
      const id = ++request.current
      measureElement(view, (viewport) => {
        if (view !== ref.current || id !== request.current) return
        measureElement(row, (item) => {
          if (view !== ref.current || id !== request.current) return
          const { x, y } = offset.current
          const dx = horizontal
            ? nearestDelta(item.x, item.x + item.width, viewport.x, viewport.x + viewport.width)
            : 0
          const dy = horizontal
            ? 0
            : nearestDelta(item.y, item.y + item.height, viewport.y, viewport.y + viewport.height)
          if (dx || dy)
            view.scrollTo({ x: Math.max(0, x + dx), y: Math.max(0, y + dy), animated: false })
        })
      })
    },
    [horizontal],
  )
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    offset.current = event.nativeEvent.contentOffset
  }
  return { ref, reveal, onScroll }
}
