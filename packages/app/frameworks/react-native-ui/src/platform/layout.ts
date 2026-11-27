/** Invalidates native overlay measurements on layout and scrolling. */
import { createContext } from 'react'

import type { OverlayTarget } from '@molecule/app-ui'

/** A scroll viewport that can clip a surface rendered in the source tree. */
export interface ScrollViewport {
  target: OverlayTarget
  parent: ScrollViewport | null
}

/** The nearest viewport enclosing the declaring component. */
export const ScrollViewportScope = createContext<ScrollViewport | null>(null)

const listeners = new Set<() => void>()

/** Reports a layout or scroll change without forcing the app presentation to rerender. */
export function layoutChanged(): void {
  for (const listener of listeners) listener()
}

/** Observes changes while an anchored surface is mounted. */
export function observeLayout(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
