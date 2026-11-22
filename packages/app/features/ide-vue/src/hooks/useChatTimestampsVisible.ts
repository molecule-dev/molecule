/**
 * Vue bindings for the per-device chat timestamp preference and the shared
 * minute clock that keeps relative times ("5 minutes ago") current — the
 * counterparts of `@molecule/app-ide-react`'s hooks of the same names.
 *
 * @module
 */

import { getCurrentScope, onScopeDispose, type Ref, ref } from 'vue'

import {
  CHAT_TIMESTAMPS_EVENT,
  CHAT_TIMESTAMPS_STORAGE_KEY,
  getChatTimestampsVisible,
} from '@molecule/app-ide-panel-logic'

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
    if (event.key === CHAT_TIMESTAMPS_STORAGE_KEY) onChange()
  }
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHAT_TIMESTAMPS_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHAT_TIMESTAMPS_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Whether chat timestamps are turned on for every item on this device. Updates
 * when `/timestamps`, a host settings toggle, or another tab changes it.
 *
 * @returns A ref that is `true` when every item's timestamp may render
 *   (default `false`).
 */
export function useChatTimestampsVisible(): Ref<boolean> {
  const visible = ref(getChatTimestampsVisible())

  /**
   * Re-reads the preference, the way React's store snapshot re-reads.
   */
  const refresh = (): void => {
    visible.value = getChatTimestampsVisible()
  }
  const unsubscribe = subscribeVisibility(refresh)
  if (getCurrentScope()) onScopeDispose(unsubscribe)
  return visible
}

// One interval for every mounted timestamp, started with the first subscriber
// and stopped with the last — a long conversation must not run an interval per row.
const minuteListeners = new Set<() => void>()
let minuteTimer: ReturnType<typeof setInterval> | undefined
let minuteNow = Date.now()

/**
 * Subscribes to the shared minute clock.
 *
 * @param onChange - Called once a minute for every subscriber at once.
 * @returns The unsubscribe function.
 */
function subscribeMinute(onChange: () => void): () => void {
  minuteListeners.add(onChange)
  if (minuteTimer === undefined) {
    minuteNow = Date.now()
    minuteTimer = setInterval(() => {
      minuteNow = Date.now()
      for (const listener of minuteListeners) listener()
    }, 60_000)
  }
  return () => {
    minuteListeners.delete(onChange)
    if (minuteListeners.size === 0 && minuteTimer !== undefined) {
      clearInterval(minuteTimer)
      minuteTimer = undefined
    }
  }
}

/**
 * The current time, refreshed once a minute for every subscriber at once.
 *
 * @returns A ref of epoch milliseconds as of the last minute tick.
 */
export function useMinuteNow(): Ref<number> {
  const now = ref(minuteNow)
  const unsubscribe = subscribeMinute(() => {
    now.value = minuteNow
  })
  // React reads the store snapshot after subscribing, and a first subscriber
  // restarts the clock from `Date.now()` — read it here for the same value.
  now.value = minuteNow
  if (getCurrentScope()) onScopeDispose(unsubscribe)
  return now
}
