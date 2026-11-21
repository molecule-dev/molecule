/**
 * Keyboard movement through a list of results.
 *
 * @module
 */

import { type MaybeRefOrGetter, shallowRef, toValue, watch } from 'vue'

import type { ListNavigation, UseListNavigationOptions } from './types.js'

/**
 * Arrow keys move the active item, Home/End jump, Enter selects it, Escape
 * calls back. The index resets when the list length changes so a stale
 * highlight never outlives its results.
 *
 * @param options - The list size and callbacks, or a ref/getter of them.
 * @returns The active index (a ref) and the key handler.
 */
export function useListNavigation(
  options: MaybeRefOrGetter<UseListNavigationOptions>,
): ListNavigation {
  const read = (): UseListNavigationOptions => toValue(options)
  const activeIndex = shallowRef(read().initialIndex ?? -1)

  // Clamp to the list: a shrink never leaves the highlight past the last row.
  watch(
    () => read().count,
    (count) => {
      if (activeIndex.value >= count) activeIndex.value = count ? count - 1 : -1
    },
    { immediate: true },
  )

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const { count, onSelect, onEscape, loop = true } = read()
    switch (event.key) {
      case 'ArrowDown':
        if (!count) return
        event.preventDefault()
        activeIndex.value =
          activeIndex.value + 1 >= count ? (loop ? 0 : count - 1) : activeIndex.value + 1
        break
      case 'ArrowUp':
        if (!count) return
        event.preventDefault()
        activeIndex.value = activeIndex.value <= 0 ? (loop ? count - 1 : 0) : activeIndex.value - 1
        break
      case 'Home':
        if (!count) return
        event.preventDefault()
        activeIndex.value = 0
        break
      case 'End':
        if (!count) return
        event.preventDefault()
        activeIndex.value = count - 1
        break
      case 'Enter':
        if (activeIndex.value >= 0 && activeIndex.value < count && onSelect) {
          event.preventDefault()
          onSelect(activeIndex.value)
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
    setActiveIndex: (index: number): void => {
      activeIndex.value = index
    },
    onKeyDown,
    reset: (): void => {
      activeIndex.value = -1
    },
  }
}
