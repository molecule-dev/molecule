/**
 * The shared reactive scaffolding of the React-named hooks: a readable store
 * that always holds a service's current value, subscribed eagerly at creation
 * (during component init) and torn down when the owning component is destroyed.
 *
 * A `readable()` store only subscribes its service when someone subscribes the
 * store, so a value read after an update with no live subscriber goes stale;
 * these hooks subscribe the service for the whole component lifetime instead,
 * the way a component's `$store` read does.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, get, type Readable, writable } from 'svelte/store'

import type { PromiseStatus } from '@molecule/app-utilities'

import type { UsePromiseStore } from './usePromise.js'

/**
 * A readable store that always holds `read()`'s value.
 *
 * The store subscribes `subscribe` eagerly (at creation, during component
 * init), re-reads whenever it notifies and ends the subscription when the
 * owning component is destroyed, so its value is current whether or not a
 * subscriber is attached right now.
 *
 * @param read - Reads the service's current value.
 * @param subscribe - Subscribes the service; returns its unsubscribe.
 * @returns A readable store of the current value.
 */
export function liveStore<T>(
  read: () => T,
  subscribe: (notify: () => void) => () => void,
): Readable<T> {
  const store = writable(read())
  const stop = subscribe(() => store.set(read()))
  onDestroy(stop)
  return { subscribe: store.subscribe }
}

/**
 * One picked field of a state store, as its own readable store.
 *
 * @param state - The store holding the whole state object.
 * @param key - The field to project out.
 * @returns A readable store of that field's current value.
 */
export function fieldStore<T, K extends keyof T>(state: Readable<T>, key: K): Readable<T[K]> {
  return derived(state, (current) => current[key])
}

/**
 * Whether a hook's options were passed as a readable store (options that change
 * without a remount) rather than as a plain value.
 *
 * @param value - The options, or a store of them.
 * @returns True for a store.
 */
export function isReadableStore<T>(value: T | Readable<T>): value is Readable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'subscribe' in value &&
    typeof value.subscribe === 'function'
  )
}

/** The field-by-field view of a `usePromise` tracker, for hooks built on it. */
export interface PromiseTrackerFields<T, A extends unknown[]> {
  /** The latest call's status. */
  status: Readable<PromiseStatus>
  /** The latest call's resolved value (kept while a newer call is pending). */
  value: Readable<T | null>
  /** The latest call's rejection. */
  error: Readable<Error | null>
  /** The tracked function (one identity for the component's life). */
  call: (...args: A) => Promise<T>
  /** Returns the tracker to idle. */
  reset: () => void
}

/**
 * Reads a `usePromise` tracker's fields as individual stores and functions,
 * for hooks built on it (`useLogin`, `useSignup`, …).
 *
 * @param T - The resolved value type.
 * @param A - The argument tuple.
 * @param tracker - The tracker store from `usePromise`.
 * @returns The status, value and error as stores, and the call and reset functions.
 */
export function promiseFields<T, A extends unknown[]>(
  tracker: UsePromiseStore<T, A>,
): PromiseTrackerFields<T, A> {
  // The state object keeps one identity (mutated in place), so reading it once
  // is enough for the action functions.
  const [state, call] = get(tracker)
  return {
    status: derived(tracker, ([current]) => current.status),
    value: derived(tracker, ([current]) => current.value),
    error: derived(tracker, ([current]) => current.error),
    call,
    reset: () => state.reset(),
  }
}
