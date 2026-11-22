/**
 * Svelte binding for the per-device tests-bar visibility preference — the
 * counterpart of `@molecule/app-ide-react`'s hook of the same name.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, readonly, writable } from 'svelte/store'

import {
  getTestsBarVisible,
  TESTS_BAR_EVENT,
  TESTS_BAR_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

/**
 * Subscribes to preference changes from this tab (the custom event) and from
 * other tabs (the `storage` event).
 *
 * @param onChange - Called whenever the preference may have changed.
 * @returns The unsubscribe function.
 */
function subscribeVisibility(onChange: () => void): () => void {
  /**
   * Applies a cross-tab preference change.
   * @param event - The `storage` event another tab fired.
   */
  const onStorage = (event: StorageEvent): void => {
    if (event.key === TESTS_BAR_STORAGE_KEY) onChange()
  }
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(TESTS_BAR_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(TESTS_BAR_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Whether the tests status bar is shown on this device. Updates when
 * `/test on|off`, a host settings toggle, or another tab changes it. Call it
 * during component init (a component's `<script>` or a `.svelte.ts` module's
 * init), where Svelte's lifecycle works.
 *
 * @returns A readable store that is `true` when the bar should render
 *   (default `true`).
 */
export function useTestsBarVisible(): Readable<boolean> {
  const visible = writable(getTestsBarVisible())

  /**
   * Re-reads the preference, the way React's store snapshot re-reads.
   */
  const refresh = (): void => {
    visible.set(getTestsBarVisible())
  }
  onDestroy(subscribeVisibility(refresh))
  return readonly(visible)
}
