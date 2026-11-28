/**
 * Validates legacy slot input at the React rendering boundary.
 *
 * @module
 */

import { Children, type ReactNode } from 'react'

/**
 * Checks whether the value is a React child without replacing valid nodes.
 * React recognizes its own opaque element and portal objects. It consumes iterables and
 * thenables during render, so checking those must leave their contents alone.
 *
 * @param value - The legacy slot value.
 * @returns Whether the slot can render the value.
 */
export function isReactNode(value: unknown): value is ReactNode {
  if (typeof value === 'function' || typeof value === 'symbol') return false
  if (value === null || typeof value !== 'object') return true
  if (Symbol.iterator in value && typeof value[Symbol.iterator] === 'function') return true
  if ('then' in value && typeof value.then === 'function') return true
  Children.count(value)
  return true
}
