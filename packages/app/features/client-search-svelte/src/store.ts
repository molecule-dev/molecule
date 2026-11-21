/**
 * Reading a Svelte hook argument that may arrive as a readable store: a hook
 * takes every reactive argument as a store, and an app may pass the plain value.
 *
 * @module
 */

import { get, type Readable, readable } from 'svelte/store'

/**
 * Whether a value is a readable store (the read half of the Svelte store
 * contract).
 *
 * @param value - Any value.
 * @returns True for a store.
 */
export function isStore<T>(value: T | Readable<T>): value is Readable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  )
}

/**
 * A value or a store of it, as a store.
 *
 * @param value - The plain value or its store.
 * @returns The store (the plain form wrapped in a constant one).
 */
export function toStore<T>(value: T | Readable<T>): Readable<T> {
  return isStore(value) ? value : readable(value)
}

/**
 * A value, a store of it, or a getter of it, as the value.
 *
 * @param value - The plain value, its store, or a getter of it.
 * @returns The current value.
 */
export function readValue<T>(value: T | Readable<T> | (() => T)): T {
  if (typeof value === 'function') return (value as () => T)()
  return isStore(value) ? get(value) : (value as T)
}
