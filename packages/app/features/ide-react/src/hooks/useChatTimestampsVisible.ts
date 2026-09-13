/**
 * React bindings for the per-device chat timestamp preference and the shared
 * minute clock that keeps relative times ("5 minutes ago") current.
 *
 * @module
 */

import { useSyncExternalStore } from 'react'

import {
  CHAT_TIMESTAMPS_EVENT,
  CHAT_TIMESTAMPS_STORAGE_KEY,
  getChatTimestampsVisible,
} from '../components/chat-timestamps-utilities.js'

/**
 * Subscribes to preference changes from this tab (the custom event) and from
 * other tabs (the `storage` event).
 *
 * @param onChange - Store-change callback supplied by React.
 * @returns The unsubscribe function.
 */
function subscribeVisibility(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === CHAT_TIMESTAMPS_STORAGE_KEY) onChange()
  }
  window.addEventListener(CHAT_TIMESTAMPS_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHAT_TIMESTAMPS_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Whether chat timestamps are turned on for every item on this device. Re-renders
 * when `/timestamps`, a host settings toggle, or another tab changes it.
 *
 * @returns `true` when every item's timestamp may render (default `false`).
 */
export function useChatTimestampsVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, getChatTimestampsVisible, () => false)
}

// One interval for every mounted timestamp, started with the first subscriber
// and stopped with the last — a long conversation must not run an interval per row.
const minuteListeners = new Set<() => void>()
let minuteTimer: ReturnType<typeof setInterval> | undefined
let minuteNow = Date.now()

/**
 * Subscribes to the shared minute clock.
 *
 * @param onChange - Store-change callback supplied by React.
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
 * @returns Epoch milliseconds as of the last minute tick.
 */
export function useMinuteNow(): number {
  return useSyncExternalStore(
    subscribeMinute,
    () => minuteNow,
    () => minuteNow,
  )
}
