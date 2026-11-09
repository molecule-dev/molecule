/**
 * Response-envelope unwrappers.
 *
 * Apps and mock servers commonly return either a bare value (`T` or
 * `T[]`) or an envelope `{ data: T }` / `{ data: T[] }`. These helpers
 * normalize either shape into a predictable `T[]` or `T | null` for
 * downstream code, eliminating the per-call `'data' in res ? ...` dance.
 *
 * Lifted out of the 59 apps that previously carried a local
 * `lib/unwrap.ts` copy. The two functions cover the response shapes used
 * by the molecule mock server and the typical resource routes — a bare
 * value, a `{ data }` envelope, and (for lists) the RICH pagination
 * envelope `{ data, total, limit, offset }` returned by the pre-built
 * `@molecule/api-resource-*` list endpoints (comment, review,
 * activity-feed, bookmark, …), and named list envelopes whose siblings
 * contain only list metadata, such as `{ items: [...], count: 10 }`.
 *
 * @module
 */

/**
 * Normalize an unknown response body into a typed array.
 *
 * Accepts:
 *   - a bare array → returned as-is (cast)
 *   - `{ data: T[] }` with optional list metadata → the inner array
 *   - a named list such as `{ articles: T[], articlesCount: number }` or
 *     `{ items: T[], count: number }` → the named array
 *   - `HttpResponse<T[]>` (i.e. `{ data: T[], status, ... }`) → the inner array
 *   - `HttpResponse<{ data: T[] }>` (the response of an envelope-returning
 *     endpoint as it arrives from `@molecule/app-http`'s `HttpClient`) → the
 *     doubly-nested inner array
 *   - `HttpResponse` wrapping any supported list envelope → the inner array
 *   - anything else → `[]`
 *
 * Callers commonly pass either the raw JSON body (e.g. from `fetch().then(r =>
 * r.json())`) or the `HttpResponse` returned by `useHttpClient().get(...)`.
 * Both shapes are handled here so pages don't have to remember to call
 * `unwrapList(res.data)` vs `unwrapList(res)`.
 *
 * An envelope must have exactly one collection array; its other keys may only
 * be pagination metadata (`count`, `total`, `page`, `limit`, cursors, `meta`,
 * `links`, etc.) or a numeric count named after the collection (`itemsCount`
 * or `items_count`). Metadata keys themselves are not collection names.
 * Resource fields such as `id`, `name` or `subtotal`, and multiple collection
 * arrays, make the body ambiguous and return `[]`. Select the intended array
 * explicitly in those cases. No resource fields are discarded, even when a
 * resource owns a `data` array. Raw bodies and HttpResponse bodies use the same
 * rule; the generic casts the rows without validating their schema.
 *
 * @param res - Raw response body OR an `HttpResponse` envelope from `@molecule/app-http`.
 * @returns A typed array `T[]`; never `null`/`undefined`.
 */
export function unwrapList<T>(res: unknown): T[] {
  const body = isHttpResponseLike(res) ? (res as { data: unknown }).data : res
  if (Array.isArray(body)) return body as T[]
  if (!body || typeof body !== 'object') return []

  const entries = Object.entries(body)
  // Metadata (including array-valued links) is never a candidate collection.
  const collections = entries.filter(
    ([key, value]) => !PAGINATION_KEYS.has(key) && Array.isArray(value),
  )
  if (collections.length !== 1) return []
  const [listKey, rows] = collections[0]
  const isEnvelope = entries.every(
    ([key, value]) =>
      key === listKey ||
      PAGINATION_KEYS.has(key) ||
      ((key === `${listKey}Count` || key === `${listKey}_count`) && typeof value === 'number'),
  )
  return isEnvelope ? (rows as T[]) : []
}

/**
 * Metadata keys a list endpoint may carry alongside its collection array.
 *
 * Covers both conventions in this fleet: `PaginatedResult` from the pre-built
 * `@molecule/api-resource-*` endpoints (`total`/`limit`/`offset`) and the
 * `page`/`limit` form hand-written handlers use.
 */
const PAGINATION_KEYS = new Set([
  'total',
  'limit',
  'offset',
  'page',
  'pageSize',
  'per_page',
  'perPage',
  'count',
  // An aggregate OVER the collection, in the same family as `total`/`count` —
  // seven flagships' notification lists answer `{ data, unreadCount, total }`.
  // The criterion for membership here is that the key describes the list rather
  // than belonging to a resource: no notification row carries `unreadCount`, so
  // this stays unambiguous. App-specific aggregates that don't meet that bar
  // belong under `meta`.
  'unreadCount',
  'unread_count',
  'hasMore',
  'has_more',
  'cursor',
  'nextCursor',
  'next_cursor',
  'meta',
  'links',
])

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
 * Normalize a response's transport/data envelopes into a typed object.
 * Named API fields remain intact: `{ record: value }` stays `{ record: value }`.
 * Select that field explicitly, e.g. `unwrapSingle<{ record: Item }>(res)?.record`.
 * The generic asserts the body's type; it does not validate its schema at runtime.
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
    // A resource may legitimately OWN a `data` field. grocery-delivery's
    // GET /api/cart answers `{ data: [...], items: [...], subtotal, delivery_fee,
    // … }` — a cart object that happens to carry its rows under `data` as well.
    // Peeling that returned the inner array, which the "caller wants a single
    // resource" branch below then turned into `null`, so the cart page rendered
    // empty while the API held the item and 20 tests failed on the empty page
    // instead of the cause. Only peel when the object is a PURE envelope: `data`
    // plus recognised pagination metadata and nothing else. The object case is
    // guarded the same way here; named resource fields remain intact.
    const looksLikeResource =
      !isHttpResponseLike(res) &&
      Object.keys(res as object).some((k) => k !== 'data' && !PAGINATION_KEYS.has(k))
    if ('data' in res && !looksLikeResource) {
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
