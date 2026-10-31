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
  return snapshot(value, new WeakMap())
}

/** Clone one value, reusing copies already made in this object graph. */
function snapshot<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (typeof value !== 'object' || value === null) return value
  if (seen.has(value)) return seen.get(value) as T
  if (Array.isArray(value)) {
    const copy = new Array(value.length)
    seen.set(value, copy)
    for (let index = 0; index < value.length; index++) {
      if (Object.prototype.hasOwnProperty.call(value, index)) {
        copy[index] = snapshot(value[index], seen)
      }
    }
    return copy as T
  }
  if (!isPlainObject(value)) return value
  const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>
  seen.set(value, copy)
  for (const key of Object.keys(value)) {
    copy[key] = snapshot(value[key], seen)
  }
  return copy as T
}
