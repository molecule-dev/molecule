/**
 * The typed error the relay client throws.
 *
 * @module
 */

import type { HttpRequestOptions, HttpResponse } from '@molecule/api-http'

/**
 * Why a relayed request failed:
 * - `refused` — the relay itself answered with a refusal (`X-Relay-Error: 1`): no or bad
 *   credential (401), egress policy denial (403), too many in flight (429), upstream
 *   unreachable / too slow / too large (502), a malformed request (400), too large a body (413).
 * - `unavailable` — the relay could not be reached, or something in front of it answered
 *   (a non-200 without `X-Relay-Error`).
 * - `protocol` — the answer did not follow the relay protocol (200 without `X-Relay-Status`).
 * - `redirect` — a redirect could not be followed (too many, a non-http(s) target, or
 *   `redirect: 'error'`).
 * - `config` — no relay URL or credential is configured.
 * - `unsupported` — the request cannot be relayed as given (e.g. a streaming body).
 */
export type RelayErrorKind =
  'refused' | 'unavailable' | 'protocol' | 'redirect' | 'config' | 'unsupported'

/**
 * A failed relayed request. Extends `TypeError` so code that catches `fetch` network
 * failures keeps working; for `kind: 'refused'` the message is the relay's own words,
 * verbatim (policy denials are written to be read by a person or an agent).
 *
 * Also satisfies the `HttpError` shape of `@molecule/api-http` when thrown by the provider.
 */
export class RelayError extends TypeError {
  /** Why it failed. */
  readonly kind: RelayErrorKind
  /** The relay's own HTTP status, when the relay answered. */
  readonly status?: number
  /** Machine-readable code, e.g. `RELAY_REFUSED`. */
  code: string
  /** The request, when thrown through the `@molecule/api-http` provider. */
  request?: HttpRequestOptions & { url: string }
  /** Always undefined: a relay failure has no upstream response. */
  response?: HttpResponse
  /** Whether the request was aborted. */
  isAborted?: boolean
  /** Whether the request timed out. */
  isTimeout?: boolean

  /**
   * Create a relay client error.
   *
   * @param kind - Why it failed.
   * @param message - What went wrong, in plain words (the relay's own text for `refused`).
   * @param status - The relay's HTTP status, when it answered.
   * @param options - Standard error options (`cause`).
   */
  constructor(kind: RelayErrorKind, message: string, status?: number, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RelayError'
    this.kind = kind
    this.status = status
    this.code = `RELAY_${kind.toUpperCase()}`
  }
}

/**
 * Whether a value is a `RelayError`.
 *
 * @param error - Anything caught.
 * @returns `true` for a relay client error.
 */
export function isRelayError(error: unknown): error is RelayError {
  return error instanceof RelayError
}
