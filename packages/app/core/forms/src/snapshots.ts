/**
 * Internal form-value snapshot support.
 *
 * @module
 */

/** Return whether a value is a plain object rather than an opaque class instance. */
function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Detach content-comparable form values recursively. Arrays retain holes, plain
 * objects and dates are copied, and opaque objects retain their identity just as
 * they do for `formValuesEqual`.
 */
export function snapshotFormValue<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Array.isArray(value)) {
    const snapshot = new Array(value.length)
    for (let index = 0; index < value.length; index++) {
      if (Object.prototype.hasOwnProperty.call(value, index)) {
        snapshot[index] = snapshotFormValue(value[index])
      }
    }
    return snapshot as T
  }
  if (typeof value === 'object' && value !== null && isPlainObject(value)) {
    const snapshot = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>
    for (const key of Object.keys(value)) {
      snapshot[key] = snapshotFormValue(value[key])
    }
    return snapshot as T
  }
  return value
}
