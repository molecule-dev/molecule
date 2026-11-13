/**
 * The snapshot-read schedule an external store subscription produces.
 *
 * React's `useSyncExternalStore` reads the snapshot at fixed points: twice
 * before subscribing (render + the commit-time tear check), once right after
 * subscribing, once per store notification (the change check), and three more
 * times after a notification that changed the snapshot (the re-render, the
 * layout check and the passive check). Binding parity includes those service
 * reads — the kit records every call a hook makes, so a composable backed by
 * the same providers replays the same schedule through this helper.
 *
 * @module
 */
import { type ShallowRef, shallowRef } from 'vue'

/**
 * What {@link subscribeExternalSnapshot} returns.
 */
export interface ExternalSnapshot<T> {
  /** The latest snapshot, replaced whenever a read returns a different one. */
  readonly state: ShallowRef<T>
  /** Stops the store subscription (the leak check counts subscriptions). */
  unsubscribe: () => void
}

/**
 * Reads a store's snapshot on React's `useSyncExternalStore` schedule.
 *
 * @param read - Reads the snapshot once (and updates whatever cache it keeps).
 * The composable's own caching decides whether two reads return the same
 * object, exactly like React's `getSnapshot`.
 * @param subscribe - Subscribes to the store; the callback receives the
 * delivered value and must decide what it caches (some providers' change
 * callbacks carry the new state, some do not).
 * @returns The snapshot ref and the unsubscriber.
 */
export function subscribeExternalSnapshot<T>(
  read: () => T,
  subscribe: (onNotify: () => void) => () => void,
): ExternalSnapshot<T> {
  const state = shallowRef<T>(read())
  // The commit-time tear check: read again before subscribing.
  absorb()
  // A notification found a changed snapshot: React re-renders, and the
  // re-render + its layout and passive checks read the snapshot three more
  // times. They are coalesced (two notifications in one block re-render once).
  // A notification whose snapshot is unchanged re-renders nothing.
  let flushQueued = false
  const queueRenderReads = (): void => {
    if (flushQueued) return
    flushQueued = true
    void Promise.resolve().then(() => {
      flushQueued = false
      absorb()
      absorb()
      absorb()
    })
  }
  /**
   * Reads the snapshot once and adopts it when it changed.
   *
   * @returns Whether the snapshot changed (React re-renders only then).
   */
  function absorb(): boolean {
    const next = read()
    if (Object.is(next, state.value)) return false
    state.value = next
    return true
  }
  const unsubscribe = subscribe(() => {
    if (absorb()) queueRenderReads()
  })
  // The post-subscribe check.
  absorb()
  return { state, unsubscribe }
}
