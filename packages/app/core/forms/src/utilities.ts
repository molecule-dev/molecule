/**
 * Form utility functions for molecule.dev.
 *
 * @module
 */

/** Return whether a value is a plain object rather than an opaque class instance. */
function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export { snapshotFormValue } from './snapshots.js'

/**
 * Compare form values recursively by content only for arrays, plain objects and
 * dates. Other objects (including files, blobs, maps and class instances) use
 * identity, so two distinct opaque values are never treated as interchangeable.
 */
export function formValuesEqual(left: unknown, right: unknown): boolean {
  return equal(left, right, new WeakMap())
}

/** Compare one pair within a cycle-safe object-graph traversal. */
function equal(left: unknown, right: unknown, seen: WeakMap<object, WeakSet<object>>): boolean {
  if (Object.is(left, right)) return true
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false
  }
  if (left instanceof Date || right instanceof Date) {
    return (
      left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime())
    )
  }
  if (seen.get(left)?.has(right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    remember(seen, left, right)
    for (let index = 0; index < left.length; index++) {
      const leftHasIndex = Object.prototype.hasOwnProperty.call(left, index)
      const rightHasIndex = Object.prototype.hasOwnProperty.call(right, index)
      if (leftHasIndex !== rightHasIndex) return false
      if (leftHasIndex && !equal(left[index], right[index], seen)) return false
    }
    return true
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false

  remember(seen, left, right)
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) && equal(left[key], right[key], seen),
    )
  )
}

/** Remember a pair before descending so a cycle cannot recurse forever. */
function remember(seen: WeakMap<object, WeakSet<object>>, left: object, right: object): void {
  const matches = seen.get(left) ?? new WeakSet<object>()
  matches.add(right)
  seen.set(left, matches)
}
