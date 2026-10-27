/**
 * File-explorer expand/collapse persistence.
 *
 * The explorer's open directories are a per-device preference read DURING
 * render, so they persist through `getPreferenceStore()` — the synchronous
 * snapshot over the app's bonded `@molecule/app-storage` provider — rather than
 * reaching for `localStorage`. Swapping the bonded provider (native, memory, a
 * test host) then redirects the tree's state too, and an absent, corrupt or
 * unreadable value reads as "nothing saved".
 *
 * @module
 */

import { getPreferenceStore } from '@molecule/app-storage'

/** The persisted set of explicitly opened and closed directory paths. */
export interface ExpandState {
  /** Directories the user opened (they default to open only at the root). */
  expanded: Set<string>
  /** Directories the user explicitly closed. */
  collapsed: Set<string>
}

/**
 * Loads persisted expand/collapse state from the bonded storage provider.
 * @param persistKey - The storage key to read from.
 * @returns The stored state, or a fresh empty state when none is saved or the
 *   stored value is unreadable.
 */
export function loadExpandState(persistKey: string): ExpandState {
  const parsed = getPreferenceStore().get<{ expanded?: string[]; collapsed?: string[] }>(persistKey)
  if (parsed && typeof parsed === 'object') {
    return {
      expanded: new Set(parsed.expanded ?? []),
      collapsed: new Set(parsed.collapsed ?? []),
    }
  }
  return { expanded: new Set(), collapsed: new Set() }
}

/**
 * Persists expand/collapse state through the bonded storage provider.
 *
 * Best-effort by contract: an unavailable or full store drops the write and the
 * tree simply reopens with its defaults.
 * @param persistKey - The storage key to write to.
 * @param state - The expand state to store.
 */
export function saveExpandState(persistKey: string, state: ExpandState): void {
  getPreferenceStore().set(persistKey, {
    expanded: [...state.expanded],
    collapsed: [...state.collapsed],
  })
}
