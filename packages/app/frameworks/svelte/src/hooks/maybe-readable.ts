/**
 * The reactive argument every hook accepts: a plain value, or a readable store
 * of one. A Svelte hook runs once per component, so the only way it can see a
 * new argument is a store the app (or a `{#key}` block's parent) sets — the way
 * React's hooks see a re-render.
 *
 * A store may hold `undefined`: that means the argument was omitted, and the
 * parameter's default applies, exactly as for a missing argument.
 *
 * @module
 */

import { type Readable, readable } from 'svelte/store'

/**
 * A plain value or a readable store of one (a store of `undefined` stands for
 * an omitted argument). Hooks read the current value when they use it and
 * follow changes for as long as the component lives.
 */
export type MaybeReadable<T> = T | Readable<T>

/**
 * Whether a value is a readable store. A molecule store (`@molecule/app-state`'s
 * `Store`: it has `getState` AND `subscribe`) is a VALUE, never a source —
 * `useStore` takes the store itself as its argument.
 *
 * @param value - A hook argument: a plain value or a store.
 * @returns True for a Svelte readable store.
 */
export function isReadable(value: unknown): value is Readable<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function' &&
    typeof (value as { getState?: unknown }).getState !== 'function'
  )
}

/**
 * The readable-store view of a hook argument: the store itself when it is one,
 * a constant store of the plain value otherwise.
 *
 * @param value - A plain value or a store of one.
 * @returns A readable store of the value.
 */
export function toReadable<T>(value: MaybeReadable<T>): Readable<T> {
  return isReadable(value) ? (value as Readable<T>) : readable(value)
}
