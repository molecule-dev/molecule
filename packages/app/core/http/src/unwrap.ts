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
 *   - `HttpResponse<T[]>` (i.e. `{ data: T[], status, ... }`) → the inner array
 *   - `HttpResponse<{ data: T[] }>` (the response of an envelope-returning
 *     endpoint as it arrives from `@molecule/app-http`'s `HttpClient`) → the
 *     doubly-nested inner array
 *   - anything else → `[]`
 *
 * Callers commonly pass either the raw JSON body (e.g. from `fetch().then(r =>
 * r.json())`) or the `HttpResponse` returned by `useHttpClient().get(...)`.
 * Both shapes are handled here so pages don't have to remember to call
 * `unwrapList(res.data)` vs `unwrapList(res)`.
 *
 * @param res - Raw response body OR an `HttpResponse` envelope from `@molecule/app-http`.
 * @returns A typed array `T[]`; never `null`/`undefined`.
 */
export function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object' && 'data' in res) {
    const inner = (res as { data: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    // `HttpResponse<{ data: T[] }>` — caller passed the whole response object
    // (typeof `{ data, status, statusText, headers, config }`) and the inner
    // JSON body is itself an envelope `{ data: T[] }`. Peel both layers, but
    // only when the outer shape is unambiguously an `HttpResponse` (i.e. has
    // the `status: number` field), so we don't mis-peel application objects.
    if (
      isHttpResponseLike(res) &&
      inner &&
      typeof inner === 'object' &&
      // Only a PURE single-key `{ data: T[] }` envelope is a double-wrap to peel.
      // A resource that legitimately carries its own `data` array field
      // (`{ id, …, data: [...] }`) has >1 key — peeling it would return the
      // resource's own array and drop the surrounding fields.
      Object.keys(inner as object).length === 1 &&
      'data' in inner &&
      Array.isArray((inner as { data: unknown }).data)
    ) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

/**
 * Recognise an `HttpResponse` from `@molecule/app-http` without taking a
 * runtime dependency on its types: an object with both `data` and a numeric
 * `status` field. Plain API JSON bodies don't include `status`, so the check
 * is unambiguous.
 */
function isHttpResponseLike(res: unknown): boolean {
  return (
    !!res &&
    typeof res === 'object' &&
    'data' in res &&
    'status' in res &&
    typeof (res as { status: unknown }).status === 'number'
  )
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
      if (typeof inner === 'object') {
        const innerObj = inner as Record<string, unknown>
        // `HttpResponse<{ data: T }>` — caller passed the whole HttpResponse
        // (recognisable by the `status: number` sibling on `res`) and the
        // inner JSON body is itself an envelope `{ data: T }`. Peel the second
        // layer. We restrict this to the HttpResponse case so plain payloads
        // shaped `{ data: { data: ... } }` keep their existing semantics.
        if (
          isHttpResponseLike(res) &&
          // Only a PURE single-key `{ data: T }` envelope is a double-wrap to
          // peel. A resource that legitimately carries its own `data` object
          // field (`{ id, …, data: {…} }`) has >1 key — peeling it would drop
          // id and the sibling fields, silently corrupting the resource.
          Object.keys(innerObj).length === 1 &&
          'data' in innerObj &&
          innerObj.data !== null &&
          innerObj.data !== undefined &&
          typeof innerObj.data === 'object' &&
          !Array.isArray(innerObj.data) &&
          Object.keys(innerObj.data as object).length > 0
        ) {
          return innerObj.data as T
        }
        if (Object.keys(innerObj).length === 0) return null
      }
      return inner as T
    }
    if (Object.keys(res as object).length === 0) return null
    return res as T
  }
  return null
}
