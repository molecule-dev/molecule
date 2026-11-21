/**
 * Reading an Angular hook argument that may arrive as a signal: a hook takes
 * every reactive argument as a signal, and an app may pass the plain value.
 *
 * @module
 */

import { isSignal, type Signal } from '@angular/core'

/**
 * A value, or a signal or getter of it, as the value.
 *
 * @param value - The plain value, its signal, or a getter of it.
 * @returns The value (reading it inside a computation tracks the signal).
 */
export function readValue<T>(value: T | Signal<T> | (() => T)): T {
  if (isSignal(value)) return value()
  return typeof value === 'function' ? (value as () => T)() : value
}
