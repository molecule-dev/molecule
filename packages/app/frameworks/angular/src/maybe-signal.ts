/**
 * A plain value or a signal holding it: what the injection-context hooks
 * accept for every argument, so a hook can follow its arguments the way
 * React's hook follows a re-render with new arguments.
 *
 * @module
 */

import { isSignal, type Signal } from '@angular/core'

/**
 * A hook argument: the plain value, or a signal holding the value the hook
 * should currently use. A signal holding `undefined` means the argument was
 * omitted, exactly like a missing plain argument: the default applies.
 *
 * @template T - The argument's shape.
 */
export type MaybeSignal<T> = T | Signal<T>

/**
 * Reads a hook argument's current value. Inside a `computed` or `effect` this
 * TRACKS a signal argument, so the reader re-runs when the argument changes;
 * outside one it is a plain read.
 *
 * @param value - The argument as the hook received it.
 * @returns The argument's current value.
 */
export function readMaybeSignal<T>(value: MaybeSignal<T>): T {
  return isSignal(value) ? value() : value
}
