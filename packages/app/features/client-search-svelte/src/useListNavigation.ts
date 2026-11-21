/**
 * Keyboard movement through a list of results.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type { OptionsInput } from './inputs.js'
import { readValue, toStore } from './store.js'
import type { ListNavigation, UseListNavigationOptions } from './types.js'

/**
 * Arrow keys move the active item, Home/End jump, Enter selects it, Escape
 * calls back. The index resets when the list length changes so a stale
 * highlight never outlives its results.
 *
 * @param options - The list size and callbacks, or a store of them.
 * @returns A store of the active index and the key handler.
 */
export function useListNavigation(
  options: OptionsInput<UseListNavigationOptions>,
): Readable<ListNavigation> {
  let activeIndex = readValue(options).initialIndex ?? -1
  let count = readValue(options).count
  const state = writable<ListNavigation>({
    activeIndex,
    setActiveIndex: (index: number) => setActiveIndex(index),
    onKeyDown: (event: KeyboardEvent) => onKeyDown(event),
    reset: () => reset(),
  })

  /** Publishes the current index. */
  function publish(): void {
    state.update((current) => ({ ...current, activeIndex }))
  }

  /**
   * Sets the active item; returns nothing, as React's dispatch call does.
   *
   * @param index - The item to activate.
   */
  function setActiveIndex(index: number): void {
    activeIndex = index
    publish()
  }

  /** Back to no active item. */
  function reset(): void {
    activeIndex = -1
    publish()
  }

  /**
   * Moves the highlight through a list of `count` items.
   *
   * @param event - The key press.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const { onSelect, onEscape, loop = true } = readValue(options)
    switch (event.key) {
      case 'ArrowDown':
        if (!count) return
        event.preventDefault()
        activeIndex = activeIndex + 1 >= count ? (loop ? 0 : count - 1) : activeIndex + 1
        publish()
        break
      case 'ArrowUp':
        if (!count) return
        event.preventDefault()
        activeIndex = activeIndex <= 0 ? (loop ? count - 1 : 0) : activeIndex - 1
        publish()
        break
      case 'Home':
        if (!count) return
        event.preventDefault()
        activeIndex = 0
        publish()
        break
      case 'End':
        if (!count) return
        event.preventDefault()
        activeIndex = count - 1
        publish()
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
  }

  // Clamp to the list: a shrink never leaves the highlight past the last row.
  const stop = toStore(options).subscribe((next) => {
    count = next.count
    if (activeIndex >= count) {
      activeIndex = count ? count - 1 : -1
      publish()
    }
  })
  onDestroy(stop)
  return { subscribe: state.subscribe }
}
