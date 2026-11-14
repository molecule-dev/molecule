/**
 * A hook argument that may arrive as a reactive source.
 *
 * Every hook whose React counterpart re-renders with new arguments takes each
 * parameter as a plain value or as a Solid accessor of it; the hook follows a
 * changed source on the same mount, the way React's hook follows a re-render.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

/**
 * A plain value or a Solid accessor holding it.
 *
 * @template T - The value type.
 */
export type MaybeAccessor<T> = T | Accessor<T>

/**
 * Reads the current value of a plain value or accessor argument.
 *
 * @param value - The argument as the caller passed it: a plain value or an
 *   accessor of one.
 * @returns The current value.
 */
export function access<T>(value: MaybeAccessor<T>): T {
  return typeof value === 'function' ? (value as Accessor<T>)() : value
}
