/**
 * Keyboard movement through a list of results.
 *
 * @module
 */

import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'

/** Options for {@link useListNavigation}. */
export interface UseListNavigationOptions {
  /** How many items there are. The active index is clamped to it. */
  count: number

  /** Called with the active index on Enter. */
  onSelect?: (index: number) => void

  /** Called on Escape (e.g. clear the input or close the panel). */
  onEscape?: () => void

  /** Wrap from the last item to the first and back. Defaults to `true`. */
  loop?: boolean

  /** The index active before any key is pressed. `-1` (the default) means none. */
  initialIndex?: number
}

/** What {@link useListNavigation} returns. */
export interface ListNavigation {
  /** The active item, or `-1`. */
  activeIndex: number

  /** Sets the active item (e.g. on pointer hover). */
  setActiveIndex: (index: number) => void

  /** Attach to the input (or the list) as `onKeyDown`. */
  onKeyDown: (event: ReactKeyboardEvent) => void

  /** Back to no active item. */
  reset: () => void
}

/**
 * Arrow keys move the active item, Home/End jump, Enter selects it, Escape
 * calls back. The index resets when the list length changes so a stale
 * highlight never outlives its results.
 *
 * @param options - The list size and callbacks.
 * @returns The active index and the key handler.
 */
export function useListNavigation(options: UseListNavigationOptions): ListNavigation {
  const { count, onSelect, onEscape, loop = true, initialIndex = -1 } = options
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => {
    setActiveIndex((i) => (i >= count ? (count ? count - 1 : -1) : i))
  }, [count])

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      switch (event.key) {
        case 'ArrowDown':
          if (!count) return
          event.preventDefault()
          setActiveIndex((i) => (i + 1 >= count ? (loop ? 0 : count - 1) : i + 1))
          break
        case 'ArrowUp':
          if (!count) return
          event.preventDefault()
          setActiveIndex((i) => (i <= 0 ? (loop ? count - 1 : 0) : i - 1))
          break
        case 'Home':
          if (!count) return
          event.preventDefault()
          setActiveIndex(0)
          break
        case 'End':
          if (!count) return
          event.preventDefault()
          setActiveIndex(count - 1)
          break
        case 'Enter':
          if (activeIndex >= 0 && activeIndex < count && onSelect) {
            event.preventDefault()
            onSelect(activeIndex)
          }
          break
        case 'Escape':
          if (onEscape) {
            event.preventDefault()
            onEscape()
          }
          break
        default:
      }
    },
    [count, loop, activeIndex, onSelect, onEscape],
  )

  const reset = useCallback(() => setActiveIndex(-1), [])
  return { activeIndex, setActiveIndex, onKeyDown, reset }
}
