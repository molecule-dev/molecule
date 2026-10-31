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

/**
 * Compare form values recursively by content only for arrays, plain objects and
 * dates. Other objects (including files, blobs, maps and class instances) use
 * identity, so two distinct opaque values are never treated as interchangeable.
 */
export function formValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false
  }
  if (left instanceof Date || right instanceof Date) {
    return (
      left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime())
    )
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((value, index) => formValuesEqual(value, right[index]))
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) && formValuesEqual(left[key], right[key]),
    )
  )
}
