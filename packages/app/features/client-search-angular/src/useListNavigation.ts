/**
 * Keyboard movement through a list of results.
 *
 * @module
 */

import { effect, signal, untracked } from '@angular/core'

import type { MaybeSignal } from './inputs.js'
import { readValue } from './signal.js'
import type { ListNavigation, UseListNavigationOptions } from './types.js'

/**
 * Arrow keys move the active item, Home/End jump, Enter selects it, Escape
 * calls back. The index resets when the list length changes so a stale
 * highlight never outlives its results.
 *
 * @param options - The list size and callbacks, or a signal of them.
 * @returns The active index (a signal) and the key handler.
 */
export function useListNavigation(options: MaybeSignal<UseListNavigationOptions>): ListNavigation {
  const read = (): UseListNavigationOptions => readValue(options)
  const activeIndex = signal(read().initialIndex ?? -1)

  // Clamp to the list: a shrink never leaves the highlight past the last row.
  // The current index is read untracked, so setting it never re-runs the clamp.
  effect(() => {
    const count = read().count
    const current = untracked(() => activeIndex())
    if (current >= count) activeIndex.set(count ? count - 1 : -1)
  })

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const { count, onSelect, onEscape, loop = true } = read()
    const current = untracked(() => activeIndex())
    switch (event.key) {
      case 'ArrowDown':
        if (!count) return
        event.preventDefault()
        activeIndex.set(current + 1 >= count ? (loop ? 0 : count - 1) : current + 1)
        break
      case 'ArrowUp':
        if (!count) return
        event.preventDefault()
        activeIndex.set(current <= 0 ? (loop ? count - 1 : 0) : current - 1)
        break
      case 'Home':
        if (!count) return
        event.preventDefault()
        activeIndex.set(0)
        break
      case 'End':
        if (!count) return
        event.preventDefault()
        activeIndex.set(count - 1)
        break
      case 'Enter':
        if (current >= 0 && current < count && onSelect) {
          event.preventDefault()
          onSelect(current)
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
      activeIndex.set(index)
    },
    onKeyDown,
    reset: (): void => {
      activeIndex.set(-1)
    },
  }
}
