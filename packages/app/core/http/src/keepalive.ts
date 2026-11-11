/**
 * Which requests are sent with fetch's `keepalive`, so a write survives the page navigating away.
 *
 * A browser cancels a document's in-flight `fetch()` as soon as the next page commits: a favorite,
 * a follow or a save clicked just before a link or a redirect is dropped on its way to the API,
 * and the server never records it (measured in Chromium: a plain POST was cancelled 4–8 ms after
 * the navigation, a `keepalive` one completed). The clients therefore keep a small write to the
 * page's own origin alive by default, within the browser's limit on in-flight keepalive bodies.
 *
 * @module
 */

/** The largest request body a write is kept alive with by default. */
export const KEEPALIVE_DEFAULT_MAX_BODY_BYTES = 8 * 1024

/**
 * The in-flight keepalive body bytes the default stays under. Browsers refuse a keepalive request
 * once the bodies of a document's in-flight keepalive requests would pass 64 KiB.
 */
export const KEEPALIVE_IN_FLIGHT_BUDGET_BYTES = 48 * 1024

/** What a client knows about a request when it decides on keepalive. */
export interface KeepaliveRequest {
  /** HTTP method. */
  method: string
  /** The request URL, absolute or relative to the page. */
  url: string
  /** The body as it will be sent (a JSON string, a Blob, bytes), or undefined for none. */
  body?: unknown
  /** The caller's own `keepalive` choice, which always wins. */
  keepalive?: boolean
}

/** A keepalive decision, holding its share of the in-flight budget until released. */
export interface KeepaliveReservation {
  /** Whether to send the request with `keepalive`. */
  keepalive: boolean
  /** Return the reserved bytes; call once the request has settled. Safe to call twice. */
  release(): void
}

let inFlightBytes = 0

const READS = /^(?:GET|HEAD|OPTIONS)$/i

/**
 * The byte length of a request body, or null when it cannot be known up front (a form, a stream).
 *
 * @param body - The body as it will be sent.
 * @returns Its size in bytes, or null.
 */
export function requestBodyBytes(body: unknown): number | null {
  if (body === undefined || body === null) return 0
  if (typeof body === 'string') return new TextEncoder().encode(body).length
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
    return new TextEncoder().encode(body.toString()).length
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size
  if (body instanceof ArrayBuffer) return body.byteLength
  if (ArrayBuffer.isView(body)) return body.byteLength
  return null
}

/** Whether `url` is on the page's own origin; false outside a page. */
function samePageOrigin(url: string): boolean {
  const page = (globalThis as { location?: { href?: unknown; origin?: unknown } }).location
  if (!page || typeof page.href !== 'string' || typeof page.origin !== 'string') return false
  try {
    return new URL(url, page.href).origin === page.origin
  } catch (_error) {
    // A URL the page cannot resolve is not one this default should touch.
    return false
  }
}

/**
 * Decide whether a request is sent with `keepalive` and reserve its body bytes while it runs.
 *
 * The caller's explicit `keepalive` always wins. Otherwise a write (any method but GET, HEAD and
 * OPTIONS) to the page's own origin whose body size is known, at most
 * {@link KEEPALIVE_DEFAULT_MAX_BODY_BYTES}, and fits the remaining
 * {@link KEEPALIVE_IN_FLIGHT_BUDGET_BYTES} is kept alive. Reads, cross-origin requests (the default
 * stays on the same-origin case, which needs no CORS preflight), forms, streams and large bodies
 * are sent as before; any of them can still ask for `keepalive: true`.
 *
 * @param request - The request's method, URL, body and explicit choice.
 * @returns The decision; call `release()` once the request settles.
 */
export function reserveKeepalive(request: KeepaliveRequest): KeepaliveReservation {
  const none: KeepaliveReservation = { keepalive: false, release: () => {} }
  if (request.keepalive === false) return none
  const bytes = requestBodyBytes(request.body)
  if (request.keepalive !== true) {
    if (READS.test(request.method) || !samePageOrigin(request.url)) return none
    if (bytes === null || bytes > KEEPALIVE_DEFAULT_MAX_BODY_BYTES) return none
    if (inFlightBytes + bytes > KEEPALIVE_IN_FLIGHT_BUDGET_BYTES) return none
  }
  const held = bytes ?? 0
  inFlightBytes += held
  let released = false
  return {
    keepalive: true,
    release() {
      if (released) return
      released = true
      inFlightBytes -= held
    },
  }
}

/**
 * The keepalive body bytes currently reserved (for tests and diagnostics).
 *
 * @returns The reserved byte count.
 */
export function keepaliveBytesInFlight(): number {
  return inFlightBytes
}
