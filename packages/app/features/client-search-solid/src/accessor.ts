/**
 * Reading a Solid argument that may arrive as an accessor: a primitive takes
 * every reactive argument as an accessor, and an app may pass the plain value.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

/**
 * A value, or an accessor of it, as the value.
 *
 * @param value - The plain value or its accessor.
 * @returns The value (reading it inside a computation tracks the accessor).
 */
export function readValue<T>(value: T | Accessor<T>): T {
  return typeof value === 'function' ? (value as Accessor<T>)() : value
}
