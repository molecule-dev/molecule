/**
 * React binding for the per-device tests-bar visibility preference.
 *
 * @module
 */

import { useSyncExternalStore } from 'react'

import {
  getTestsBarVisible,
  TESTS_BAR_EVENT,
  TESTS_BAR_STORAGE_KEY,
} from '../components/tests-bar-utilities.js'

/**
 * Subscribes to preference changes from this tab (the custom event) and from
 * other tabs (the `storage` event).
 *
 * @param onChange - Store-change callback supplied by React.
 * @returns The unsubscribe function.
 */
function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === TESTS_BAR_STORAGE_KEY) onChange()
  }
  window.addEventListener(TESTS_BAR_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(TESTS_BAR_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Whether the tests status bar is shown on this device. Re-renders when
 * `/test on|off`, a host settings toggle, or another tab changes it.
 *
 * The server-render fallback is `true`, matching the stored default: the bar is
 * on unless someone turned it off.
 *
 * @returns `true` when the bar should render (default `true`).
 */
export function useTestsBarVisible(): boolean {
  return useSyncExternalStore(subscribe, getTestsBarVisible, () => true)
}
