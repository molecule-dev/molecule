/**
 * Pure shallow-diff helper for version snapshots.
 *
 * Compares two object-shaped snapshots key-by-key and emits a
 * {@link VersionChanges} record describing only the keys whose values
 * differ. Non-object snapshots (primitives, arrays at the top level) are
 * supported via a single synthetic `'$value'` key.
 *
 * @module
 */

import type { JSONValue, VersionChanges, VersionFieldChange } from './types.js'

/**
 * Returns `true` if `a` and `b` are deeply equal as JSON values.
 *
 * @param a - First value to compare.
 * @param b - Second value to compare.
 * @returns Whether the two values are structurally equal.
 */
export function jsonEqual(a: JSONValue | undefined, b: JSONValue | undefined): boolean {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!jsonEqual(a[i], b[i])) return false
    }
    return true
  }

  const aRecord = a as Record<string, JSONValue>
  const bRecord = b as Record<string, JSONValue>
  const aKeys = Object.keys(aRecord)
  const bKeys = Object.keys(bRecord)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bRecord, key)) return false
    if (!jsonEqual(aRecord[key], bRecord[key])) return false
  }
  return true
}

/**
 * Computes a shallow per-field diff between two JSON snapshots.
 *
 * For object snapshots, every key present in either snapshot is examined;
 * keys whose values differ (by deep equality) are included in the result.
 * For non-object snapshots, the entire value is reported under the
 * synthetic key `$value`.
 *
 * @param before - The previous snapshot, or `null` if this is the first version.
 * @param after - The new snapshot.
 * @returns A {@link VersionChanges} record. Empty when the snapshots are equal.
 */
export function diffSnapshots(before: JSONValue | null, after: JSONValue): VersionChanges {
  const changes: VersionChanges = {}

  if (before === null) {
    if (isPlainObject(after)) {
      for (const [key, value] of Object.entries(after)) {
        changes[key] = { after: value }
      }
    } else {
      changes.$value = { after }
    }
    return changes
  }

  const beforeIsObject = isPlainObject(before)
  const afterIsObject = isPlainObject(after)

  if (!beforeIsObject || !afterIsObject) {
    if (!jsonEqual(before, after)) {
      changes.$value = { before, after }
    }
    return changes
  }

  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)])
  for (const key of keys) {
    const beforeValue = before[key]
    const afterValue = after[key]
    if (jsonEqual(beforeValue, afterValue)) continue

    const change: VersionFieldChange = {}
    if (beforeValue !== undefined) change.before = beforeValue
    if (afterValue !== undefined) change.after = afterValue
    changes[key] = change
  }

  return changes
}

/**
 * Type-guard for a plain JSON object (record, not array, not null).
 *
 * @param value - The value to check.
 * @returns Whether the value is a plain JSON object.
 */
function isPlainObject(value: JSONValue): value is Record<string, JSONValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
