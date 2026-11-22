/**
 * Svelte bindings for the per-device chat timestamp preference and the shared
 * minute clock that keeps relative times ("5 minutes ago") current — the
 * counterparts of `@molecule/app-ide-react`'s hooks of the same names.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, readonly, writable } from 'svelte/store'

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
 * when `/timestamps`, a host settings toggle, or another tab changes it. Call
 * it during component init (a component's `<script>` or a `.svelte.ts`
 * module's init), where Svelte's lifecycle works.
 *
 * @returns A readable store that is `true` when every item's timestamp may
 *   render (default `false`).
 */
export function useChatTimestampsVisible(): Readable<boolean> {
  const visible = writable(getChatTimestampsVisible())

  /**
   * Re-reads the preference, the way React's store snapshot re-reads.
   */
  const refresh = (): void => {
    visible.set(getChatTimestampsVisible())
  }
  onDestroy(subscribeVisibility(refresh))
  return readonly(visible)
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
 * @returns A readable store of epoch milliseconds as of the last minute tick.
 */
export function useMinuteNow(): Readable<number> {
  const now = writable(minuteNow)
  onDestroy(
    subscribeMinute(() => {
      now.set(minuteNow)
    }),
  )
  // React reads the store snapshot after subscribing, and a first subscriber
  // restarts the clock from `Date.now()` — read it here for the same value.
  now.set(minuteNow)
  return readonly(now)
}
