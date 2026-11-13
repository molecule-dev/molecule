/**
 * The external-store read discipline React's `useSyncExternalStore` hooks have,
 * as a reusable bridge for the Angular hooks over providers that announce
 * changes (`useVersion`, `useWorkspace`, `usePreview`).
 *
 * React reads the store twice while rendering, subscribes, then reads again to
 * catch a change that landed in between; every notification re-reads once, and
 * a notification that actually changed the snapshot re-reads three more times
 * while React re-renders and re-checks. Service providers RECORD those reads,
 * so a binding that reads a different number of times is a different client of
 * the provider — this bridge keeps this package's read discipline identical to
 * React's.
 *
 * The `read` passed in must cache its snapshot the way React's hook does (a
 * stable object between notifications); the bridge compares snapshots by
 * identity, exactly like `useSyncExternalStore`.
 *
 * @module
 */

import { DestroyRef, inject, type Signal, signal, untracked } from '@angular/core'

/**
 * Subscribes to an external store and mirrors its value into a signal, with
 * React's read discipline. Call it in an injection context.
 *
 * @param read - Reads the store's current snapshot (records on the provider);
 *   must return a stable object between notifications.
 * @param subscribe - Subscribes to the store; receives the hook's own
 *   snapshot-invalidating callback and returns the unsubscribe function.
 * @returns A signal of the store's current snapshot.
 */
export function useExternalStore<T>(
  read: () => T,
  subscribe: (notify: () => void) => () => void,
): Signal<T> {
  // React reads the snapshot twice during its render phase.
  read()
  const state = signal<T>(read())
  let reRenderScheduled = false
  const stop = subscribe(() => {
    // Every notification re-reads once, changed or not.
    const next = read()
    if (Object.is(untracked(state), next)) return
    state.set(next)
    if (reRenderScheduled) return
    reRenderScheduled = true
    queueMicrotask(() => {
      reRenderScheduled = false
      // React re-renders (one read) and its commit re-checks the snapshot
      // (two more reads) once per update, however many notifications landed
      // in the same flush.
      state.set(read())
      read()
      read()
    })
  })
  // A change between the first read and this subscription still shows: React
  // reads again right after subscribing.
  state.set(read())
  inject(DestroyRef).onDestroy(stop)
  return state.asReadonly()
}
