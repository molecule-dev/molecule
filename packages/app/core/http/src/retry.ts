/**
 * Bounded retry policy for idempotent HTTP requests.
 *
 * A rolling deploy restarts one API instance at a time, so a request can fail
 * with `502`/`503`/`504` or a reset connection for a few seconds even though
 * the platform is healthy. Retrying those — and ONLY those, and only when the
 * request is safe to repeat — turns a user-visible error into a short wait.
 *
 * The rules the policy enforces:
 *
 * - **Idempotent methods only.** `GET`, `HEAD`, `PUT`, `DELETE` and `OPTIONS`
 *   may be repeated. `POST` and `PATCH` are retried ONLY when the caller sent
 *   an `Idempotency-Key` header, which tells the server to collapse the repeat
 *   (a retried POST without one can create two records).
 * - **Transient failures only.** Statuses `502`/`503`/`504`, and connection
 *   errors (reset/refused/timeout). A `500` is a server bug, not a rolling
 *   restart, and is not retried.
 * - **Bounded.** Two retries by default, exponential backoff with jitter, and
 *   `Retry-After` from the server is honored when present.
 * - **Never on an abort.** A cancelled request (effect cleanup, navigation) is
 *   not retried.
 *
 * @module
 */

import type { HttpMethod } from './types.js'

/**
 * Tuning for the retry policy.
 */
export interface RetryOptions {
  /**
   * Maximum retries AFTER the first attempt. Defaults to `2` (three attempts
   * in total).
   */
  maxRetries?: number

  /** Base backoff in milliseconds. Defaults to `300`. */
  baseDelayMs?: number

  /** Maximum backoff (before `Retry-After` can extend it). Defaults to `5000`. */
  maxDelayMs?: number

  /** Statuses treated as transient. Defaults to `[502, 503, 504]`. */
  retryStatuses?: number[]
}

/** The resolved policy used when a caller passes no options. */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
  retryStatuses: [502, 503, 504],
}

/** The request fields the policy decides from. */
export interface RetryDecisionInput {
  /** The request method. */
  method: HttpMethod
  /** The request headers (lower-cased lookup is done here). */
  headers: Record<string, string | undefined>
  /** The HTTP status, or `0` when no response arrived. */
  status: number
  /** How many retries have already been made (0 for the first failure). */
  attempt: number
  /** The error message, used to recognize a connection reset/refusal. */
  errorMessage?: string
  /** `true` when the request was aborted before a response. */
  aborted?: boolean
  /** Overrides layered over {@link DEFAULT_RETRY_OPTIONS}. */
  options?: RetryOptions | false
}

/**
 * Read one header case-insensitively.
 *
 * @param headers - The header map.
 * @param name - The header name (any case).
 * @returns The value, or undefined.
 */
function headerValue(
  headers: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const wanted = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value
  }
  return undefined
}

/**
 * Whether a request may be repeated at all.
 *
 * @param method - The HTTP method.
 * @param headers - The request headers (an `Idempotency-Key` makes POST/PATCH repeatable).
 * @returns `true` when repeating the request cannot duplicate a side effect.
 */
export function isIdempotentRequest(
  method: HttpMethod,
  headers: Record<string, string | undefined>,
): boolean {
  switch (method) {
    case 'GET':
    case 'HEAD':
    case 'PUT':
    case 'DELETE':
    case 'OPTIONS':
      return true
    case 'POST':
    case 'PATCH':
      // Repeating a create is only safe when the SERVER has a key to collapse
      // the duplicate on — the caller's assertion, not ours to assume.
      return Boolean(headerValue(headers, 'idempotency-key'))
    default:
      return false
  }
}

/**
 * Whether a connection-level error is transient (a restarted process refuses
 * or resets connections; a DNS or TLS configuration error does not).
 *
 * @param message - The error message.
 * @returns `true` for reset/refused/closed-early/timeout shapes.
 */
export function isTransientConnectionError(message: string | undefined): boolean {
  if (!message) return false
  return /ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|socket hang up|connection (?:reset|refused|closed)|failed to fetch|fetch failed|network ?error|load failed/i.test(
    message,
  )
}

/**
 * Parse a `Retry-After` header into milliseconds from now.
 *
 * @param value - The header value (`seconds` or an HTTP date).
 * @param now - The clock, injected for tests.
 * @returns Milliseconds to wait, or undefined when absent/unparseable.
 */
export function parseRetryAfter(
  value: string | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1_000
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, date - now)
}

/**
 * Decide whether one failed request should be retried.
 *
 * @param input - The method, headers, status/error and attempt count.
 * @returns `true` when the request may be repeated.
 */
export function shouldRetryRequest(input: RetryDecisionInput): boolean {
  if (input.options === false) return false
  if (input.aborted) return false
  const options = { ...DEFAULT_RETRY_OPTIONS, ...(input.options ?? {}) }
  if (input.attempt >= options.maxRetries) return false
  if (!isIdempotentRequest(input.method, input.headers)) return false
  if (input.status !== 0) return options.retryStatuses.includes(input.status)
  return isTransientConnectionError(input.errorMessage)
}

/**
 * Compute the wait before the next attempt.
 *
 * `Retry-After` wins when the server sent one (it knows when the instance will
 * be back); otherwise exponential backoff with full jitter.
 *
 * @param retryAfter - The raw `Retry-After` header value, when present.
 * @param attempt - How many retries have already been made (0 for the first).
 * @param options - Policy overrides.
 * @param random - Jitter source, injected for tests (defaults to `Math.random`).
 * @returns Milliseconds to wait before retrying.
 */
export function retryDelayMs(
  retryAfter: string | undefined,
  attempt: number,
  options?: RetryOptions | false,
  random: () => number = Math.random,
): number {
  const resolved = { ...DEFAULT_RETRY_OPTIONS, ...(options === false ? {} : (options ?? {})) }
  const fromHeader = parseRetryAfter(retryAfter)
  if (fromHeader !== undefined) return Math.min(fromHeader, resolved.maxDelayMs)
  const exponential = resolved.baseDelayMs * 2 ** attempt
  // Full jitter in [0, exponential] avoids a fleet of clients retrying in
  // lockstep after one instance restarts.
  const jittered = random() * exponential
  return Math.min(Math.max(resolved.baseDelayMs / 2, jittered), resolved.maxDelayMs)
}
