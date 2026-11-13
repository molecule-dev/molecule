/**
 * Per-instance DOM id generation for React `useId()` parity.
 *
 * @module
 */

let counter = 0

/**
 * Mints a unique DOM id. React's `useId()` produces per-render-instance ids
 * that the conformance normalizer renumbers by document order, so the exact
 * format does not matter — only uniqueness and stable per-instance identity
 * (one call per logical id, kept in a field).
 *
 * @returns A unique id string.
 */
export function nextInstanceId(): string {
  counter += 1
  return `mol-${counter.toString(36)}`
}
