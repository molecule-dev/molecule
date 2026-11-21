/**
 * Keyboard movement through a list of results.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, on } from 'solid-js'

import { readValue } from './accessor.js'
import type { ListNavigation, UseListNavigationOptions } from './types.js'

/**
 * Arrow keys move the active item, Home/End jump, Enter selects it, Escape
 * calls back. The index resets when the list length changes so a stale
 * highlight never outlives its results.
 *
 * @param options - The list size and callbacks, or an accessor of them.
 * @returns The active index (an accessor) and the key handler.
 */
export function useListNavigation(
  options: UseListNavigationOptions | Accessor<UseListNavigationOptions>,
): ListNavigation {
  const read = (): UseListNavigationOptions => readValue(options)
  const [activeIndex, setActiveIndex] = createSignal(read().initialIndex ?? -1)

  // Clamp to the list: a shrink never leaves the highlight past the last row.
  createEffect(
    on(
      () => read().count,
      (count) => {
        if (activeIndex() >= count) setActiveIndex(count ? count - 1 : -1)
      },
      { defer: false },
    ),
  )

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const { count, onSelect, onEscape, loop = true } = read()
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
        if (activeIndex() >= 0 && activeIndex() < count && onSelect) {
          event.preventDefault()
          onSelect(activeIndex())
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
  }

  return {
    activeIndex,
    // The exposed setters return nothing, as React's `Dispatch` calls do.
    setActiveIndex: (index: number): void => {
      setActiveIndex(index)
    },
    onKeyDown,
    reset: (): void => {
      setActiveIndex(-1)
    },
  }
}
