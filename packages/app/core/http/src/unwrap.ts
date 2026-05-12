/**
 * Response-envelope unwrappers.
 *
 * Apps and mock servers commonly return either a bare value (`T` or
 * `T[]`) or an envelope `{ data: T }` / `{ data: T[] }`. These helpers
 * normalize either shape into a predictable `T[]` or `T | null` for
 * downstream code, eliminating the per-call `'data' in res ? ...` dance.
 *
 * Lifted out of the 59 apps that previously carried a local
 * `lib/unwrap.ts` copy. The two functions cover the only two response
 * shapes used by the molecule mock server and the typical resource
 * routes; richer envelopes (pagination metadata, etc.) are out of scope
 * — handle those in the caller.
 *
 * @module
 */

/**
 * Normalize an unknown response body into a typed array.
 *
 * Accepts:
 *   - a bare array → returned as-is (cast)
 *   - `{ data: T[] }` envelope → the inner array
 *   - anything else → `[]`
 *
 * @param res - Raw response body (e.g. `HttpResponse.data` from `@molecule/app-http`).
 * @returns A typed array `T[]`; never `null`/`undefined`.
 */
export function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T[] }).data
  }
  return []
}

/**
 * Normalize an unknown response body into a single typed resource.
 *
 * Accepts:
 *   - a non-empty plain object → returned as-is (cast)
 *   - `{ data: T }` envelope → the inner value
 *   - `{ data: null }`, `{ data: undefined }`, `{ data: [] }`, or
 *     `{ data: {} }` (mock-server's no-match shape) → `null`
 *   - an empty object `{}` → `null`
 *   - arrays, primitives, `null`, `undefined` → `null`
 *
 * The "envelope contains an array → null" branch handles the case
 * where the mock server returns `[]` for unmatched endpoints but the
 * caller expects a single resource.
 *
 * @param res - Raw response body (e.g. `HttpResponse.data` from `@molecule/app-http`).
 * @returns The typed resource `T`, or `null` when the response shape
 *   indicates "no resource" (including the various empty envelopes
 *   above).
 */
export function unwrapSingle<T>(res: unknown): T | null {
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    if ('data' in res) {
      const inner = (res as { data: unknown }).data
      if (inner === null || inner === undefined) return null
      // Caller expects a single resource. If the envelope contains an array
      // (mock-server returns [] for unmatched endpoints), treat as missing.
      if (Array.isArray(inner)) return null
      if (typeof inner === 'object' && Object.keys(inner as object).length === 0) return null
      return inner as T
    }
    if (Object.keys(res as object).length === 0) return null
    return res as T
  }
  return null
}
