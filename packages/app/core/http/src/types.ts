/**
 * Core type definitions for the HTTP client.
 *
 * @module
 */

import { snapshotCredentials } from '@molecule/app-logger'

import type { RetryOptions } from './retry.js'
import { redactUrlCredentials } from './url.js'

// A global brand keeps failed-request classification working across realms and
// duplicated package copies. It is deliberately not an exported runtime key.
const HTTP_ERROR_BRAND = Symbol.for('@molecule/app-http/HttpError')

/**
 * HTTP request method.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * HTTP request options (headers, query params, timeout, credentials, response type, abort signal).
 */
export interface RequestConfig {
  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Query parameters.
   */
  params?: Record<string, string | number | boolean | undefined>

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials (cookies).
   */
  withCredentials?: boolean

  /**
   * Send this request WITHOUT waiting for the session restore (the auth gate).
   *
   * A request the gate's restore issues from a LATER continuation must set this. The gate
   * recognizes a request the settle function issues while it runs and never holds it — this
   * package's client awaits the gate before anything else, so a `restoreSession()` that calls
   * it directly does not deadlock. But a restore that awaits something else first
   * (`await storage.get()`), then calls the client, reaches `awaitAuthGate` after that window:
   * the gate then waits on itself, and every request on the page stalls until the gate times
   * out (3 s) — so pass `skipAuthGate: true` on that request. A provider that awaits the gate
   * inside a scheduled interceptor (the Axios bond) also reaches it after the window, so its
   * restore's request needs the opt-out.
   *
   * ```typescript
   * // the request the gate's restore makes, through the same client the gate holds back
   * await http.get(currentUserEndpoint, { skipAuthGate: true })
   * ```
   *
   * `@molecule/app-auth`'s own restore does not need it — it sends its request with
   * `fetch`, not through this client. An app with its own session store that registers a
   * gate with `setAuthGate` does not need it either when its restore calls the client
   * directly.
   */
  skipAuthGate?: boolean

  /**
   * Response type.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal

  /**
   * Request body data, as a field of THIS config object — the `request({ method, url, data })`
   * form. The verb methods take the body as their SECOND argument: `post(url, data, config)`,
   * `put(url, data, config)`, `patch(url, data, config)`. Never wrap it there as
   * `{ data: body }`: that object is the body, so the wire sends `{"data":body}` and the API
   * sees none of the fields at its top level.
   */
  data?: unknown

  /**
   * Custom request options (implementation-specific).
   */
  options?: Record<string, unknown>

  /**
   * Retry policy for this request, or `false` to disable retries.
   *
   * The default policy retries only IDEMPOTENT requests (`GET`/`HEAD`/`PUT`/
   * `DELETE`/`OPTIONS`, and `POST`/`PATCH` carrying an `Idempotency-Key`) on
   * `502`/`503`/`504` or a reset/refused connection, twice, with exponential
   * backoff and jitter, honoring `Retry-After`. See `@molecule/app-http`'s
   * `shouldRetryRequest`.
   */
  retry?: RetryOptions | false
}

/**
 * What the auth gate is told about the request it is about to hold: whether the request
 * opts out of the wait, and how to name it in the stalled-gate report.
 *
 * A request's own `RequestConfig` satisfies this — the providers pass it straight through
 * (`awaitAuthGate(requestConfig)`), so a provider never has to build one by hand.
 */
export interface AuthGateRequest {
  /**
   * Send this request without waiting for the gate at all — see
   * `RequestConfig.skipAuthGate`.
   */
  skipAuthGate?: boolean

  /**
   * The request's HTTP method, for the message logged when the gate never settles.
   */
  method?: string

  /**
   * The request's URL, for the message logged when the gate never settles. Any userinfo or
   * credential query/fragment values are redacted from that report; non-secret parts remain.
   */
  url?: string
}

/**
 * Full request configuration including method and URL.
 */
export interface FullRequestConfig extends RequestConfig {
  /**
   * HTTP method.
   */
  method: HttpMethod

  /**
   * Request URL (can be relative or absolute).
   */
  url: string

  /**
   * Request body data — a field of this config object, never a second argument here.
   */
  data?: unknown
}

/**
 * Parsed HTTP response with status code, headers, and typed body data.
 */
export interface HttpResponse<T = unknown> {
  /**
   * Response data.
   */
  data: T

  /**
   * HTTP status code.
   */
  status: number

  /**
   * HTTP status text.
   */
  statusText: string

  /**
   * Response headers.
   */
  headers: Record<string, string>

  /**
   * Original request config.
   */
  config: FullRequestConfig
}

/** The boolean-only notification controls an error interceptor may read. */
const ERROR_INTERCEPTOR_OPTIONS = [
  'molSilentErrorNotification',
  'molSilentRateLimitNotification',
] as const

/** Keep notification suppression without retaining arbitrary provider options. */
const errorInterceptorOptions = (
  options: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!options) return undefined
  const safe = Object.fromEntries(
    ERROR_INTERCEPTOR_OPTIONS.flatMap((key) => (options[key] === true ? [[key, true]] : [])),
  )
  return Object.keys(safe).length > 0 ? safe : undefined
}

/** Keep only non-credential request metadata on an error that may be logged. */
const errorRequestConfig = (config: FullRequestConfig): FullRequestConfig => {
  const url = redactUrlCredentials(config.url)
  const options = errorInterceptorOptions(config.options)
  // Even the minimal public form is detached: a later caller mutation must not
  // introduce credentials into the error's retained config or response.config.
  return { method: config.method, url, ...(options ? { options } : {}) }
}

/** Fresh Blobs already materialized by the async failure boundary; no native property is written. */
const retainedErrorBlobs = new WeakSet<Blob>()

const isBuffer = (value: unknown): value is ArrayBuffer | SharedArrayBuffer =>
  value instanceof ArrayBuffer ||
  (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer)

const sharedBuffer = (bytes: Uint8Array): SharedArrayBuffer => {
  const copy = new SharedArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

/** Clone a view over its exact bytes, retaining element width, offset-independent length and kind. */
const cloneBinaryBody = (
  original: ArrayBuffer | SharedArrayBuffer | ArrayBufferView,
  bytes: Uint8Array,
): unknown => {
  if (typeof SharedArrayBuffer !== 'undefined' && original instanceof SharedArrayBuffer) {
    return sharedBuffer(bytes)
  }
  if (original instanceof ArrayBuffer) return original.slice(0)
  const copy = bytes.slice()
  if (original instanceof DataView) return new DataView(copy.buffer)
  if (typeof Buffer !== 'undefined' && original instanceof Buffer) return Buffer.from(copy)
  const View = original.constructor as new (buffer: ArrayBuffer) => ArrayBufferView
  return new View(copy.buffer)
}

/** Rebuild only changed textual bytes; unchanged and non-text bodies are cloned byte-for-byte. */
const retainedBinaryBody = (original: unknown, snapshot: unknown): unknown => {
  if (!isBuffer(original) && !ArrayBuffer.isView(original)) return snapshot
  let bytes: Uint8Array
  try {
    bytes = isBuffer(original)
      ? new Uint8Array(original)
      : new Uint8Array(original.buffer, original.byteOffset, original.byteLength)
  } catch (_detached) {
    return snapshot
  }

  let decoded: string | undefined
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (_error) {
    // A genuine non-text body is retained byte-for-byte below.
  }
  if (decoded === undefined || snapshot === decoded || typeof snapshot !== 'string') {
    return cloneBinaryBody(original, bytes)
  }

  // snapshotCredentials decodes without a BOM. Restore one on changed text too,
  // then construct typed/BigInt views over bytes rather than numeric elements.
  const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const encoded = new TextEncoder().encode(hasUtf8Bom ? `\uFEFF${snapshot}` : snapshot)
  if (typeof SharedArrayBuffer !== 'undefined' && original instanceof SharedArrayBuffer) {
    return sharedBuffer(encoded)
  }
  if (original instanceof ArrayBuffer) return encoded.buffer
  if (original instanceof DataView) return new DataView(encoded.buffer)
  if (typeof Buffer !== 'undefined' && original instanceof Buffer) return Buffer.from(encoded)
  const View = original.constructor as (new (buffer: ArrayBuffer) => ArrayBufferView) & {
    BYTES_PER_ELEMENT?: number
  }
  const width = View.BYTES_PER_ELEMENT ?? 1
  return encoded.byteLength % width === 0 ? new View(encoded.buffer) : encoded
}

/** Scrub response headers/body into a new tree and project safe request metadata onto it. */
const errorResponse = (response: HttpResponse): HttpResponse => {
  const config = errorRequestConfig(response.config)
  const scrubbed = snapshotCredentials(response)
  return {
    ...scrubbed,
    data:
      typeof Blob !== 'undefined' &&
      response.data instanceof Blob &&
      retainedErrorBlobs.has(response.data)
        ? response.data
        : retainedBinaryBody(response.data, scrubbed.data),
    config,
  }
}

/**
 * Materialize a failed response body before the synchronous HttpError capture. Unchanged bytes
 * are cloned directly, including a Blob's BOM and every typed-array kind. Changed textual bytes
 * retain the BOM and use a Uint8Array fallback if the original view's alignment no longer fits.
 * Successful responses never pass through this helper.
 *
 * @param body - A response body about to be retained on a failed request.
 * @returns A scrubbed body with unchanged binary content preserved byte-for-byte.
 */
export const snapshotHttpErrorBody = async <T>(body: T): Promise<T> => {
  if (isBuffer(body) || ArrayBuffer.isView(body)) {
    return retainedBinaryBody(body, snapshotCredentials(body)) as T
  }
  if (typeof Blob === 'undefined' || !(body instanceof Blob)) return body
  try {
    const bytes = new Uint8Array(await body.arrayBuffer())
    let snapshot: Blob
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      const scrubbed = snapshotCredentials(text)
      if (scrubbed === text) {
        snapshot = new Blob([bytes], { type: body.type })
      } else {
        const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        const encoded = new TextEncoder().encode(hasUtf8Bom ? `\uFEFF${scrubbed}` : scrubbed)
        snapshot = new Blob([encoded], { type: body.type })
      }
    } catch (_nonText) {
      snapshot = new Blob([bytes], { type: body.type })
    }
    retainedErrorBlobs.add(snapshot)
    return snapshot as T
  } catch (_unreadable) {
    retainedErrorBlobs.add(body)
    return body
  }
}

/**
 * Read and scrub a failed response once for a retained-error reconstruction. The detached capture
 * carries the original body kind, safe response metadata, and minimal request config, so callers
 * such as auth never need to read the source response or its body again.
 *
 * @param response - The failed HTTP response to capture.
 * @returns A detached, credential-scrubbed response preserving binary body bytes where safe.
 */
export const snapshotHttpErrorResponse = async <T extends HttpResponse>(
  response: T,
): Promise<T> => {
  const captured = {
    ...response,
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config: response.config,
  }
  captured.data = await snapshotHttpErrorBody(captured.data)
  return errorResponse(captured) as T
}

/**
 * HTTP error with response details.
 *
 * `instanceof HttpError` also recognizes compatible failures carrying the shared
 * `Symbol.for('@molecule/app-http/HttpError')` brand, including non-ok auth responses
 * and errors from duplicated package copies. Branded producers must provide this
 * class's instance fields. Subclasses retain ordinary prototype-based checks.
 *
 * Request metadata on `config` and `response.config` is limited to method, a
 * credential-redacted URL, and the two boolean notification-suppression controls
 * (`molSilentErrorNotification` and `molSilentRateLimitNotification`). Request bodies,
 * headers, params and all other provider options are omitted, as are credential-bearing
 * response headers, because errors are routinely serialized by logging transports.
 *
 * **`status` is an HTTP status when the server answered, and `0` when it did not.**
 * A `0` means NO response exists: the request was aborted (an `AbortController`, a
 * component's effect cleanup, a route change tearing the request down) or the
 * network failed before anything came back. It is not an HTTP status at all, so it
 * says nothing about the session — an app must never treat `status < 500` as
 * "signed out", because every aborted request on a route change would clear the
 * session. The correct check is {@link isAuthFailure} (`status === 401 || status === 403`);
 * `isNoResponse` (`status === 0`) identifies this case.
 *
 * @example
 * ```typescript
 * try {
 *   await http.get('/projects')
 * } catch (err) {
 *   if (isAuthFailure(err)) clearSession()      // 401/403: the server rejected the credential
 *   else if (isNoResponse(err)) return           // aborted or offline — not a session decision
 *   else showError(err)
 * }
 * ```
 */
export class HttpError extends Error {
  /**
   * Recognizes the shared failed-request contract without widening subclass checks.
   *
   * @param value - Any value to test.
   * @returns True for a prototype instance, or a compatible branded value checked against the base class.
   */
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      Function.prototype[Symbol.hasInstance].call(this, value) ||
      (this === HttpError &&
        typeof value === 'object' &&
        value !== null &&
        (value as Record<symbol, unknown>)[HTTP_ERROR_BRAND] === true)
    )
  }

  /**
   * Redacts URL userinfo and credential query/fragment values while preserving the path and
   * non-secret parameters. Shared by compatible HTTP and auth error/log views.
   */
  static readonly redactUrlCredentials = redactUrlCredentials

  /**
   * Builds a failed-request error.
   *
   * @param message - Human-readable message (already translated where a key exists);
   *   credentials in any URL it contains are redacted.
   * @param status - HTTP status, or `0` when no response was received (aborted / network failure).
   * @param response - Parsed response when the server answered, otherwise undefined;
   *   its request config and headers are sanitized for safe logging.
   * @param config - The request config that failed; only its method, redacted URL and
   *   boolean notification-suppression controls are retained.
   * @param errorKey - Translation key for the failure (`http.error.aborted` for an
   *   aborted request, `http.error.networkError` for a real network failure).
   * @param aborted - Whether the request was aborted before a response: an
   *   `AbortController` signal (component cleanup, a cancelled request) or the
   *   browser tearing the fetch down during a navigation. Distinguishes an abort
   *   from a network outage on the same `status === 0`, without parsing the message.
   */
  constructor(
    message: string,
    public status: number,
    public response?: HttpResponse,
    public config?: FullRequestConfig,
    public errorKey?: string,
    public aborted = false,
  ) {
    super(snapshotCredentials(message))
    this.name = 'HttpError'
    this.response = response ? errorResponse(response) : undefined
    this.config = config ? errorRequestConfig(config) : undefined
    Object.defineProperty(this, HTTP_ERROR_BRAND, { value: true })
  }
}
