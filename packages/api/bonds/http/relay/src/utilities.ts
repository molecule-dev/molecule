/**
 * Portable helpers for the relay client: no Node built-ins, so they run in any runtime
 * with `fetch`, `URL`, `Headers`, `TextEncoder` and `btoa`.
 *
 * @module
 */

import { RelayError } from './errors.js'
import type { RelayOptions } from './types.js'

/** Environment variable holding the relay endpoint URL. */
export const RELAY_URL_ENV = 'MOLECULE_EGRESS_RELAY_URL'
/** Environment variable holding the project's egress credential. */
export const RELAY_CREDENTIAL_ENV = 'MOLECULE_EGRESS_CREDENTIAL'
/** Default for `maxRedirects`. */
export const DEFAULT_MAX_REDIRECTS = 5

/** Statuses a fetch follows as redirects. */
export const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
/** Statuses whose response never has a body. */
export const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304])

/** Headers the relay adds to its own answer: not part of the upstream response. */
const RELAY_RESPONSE_HEADERS = new Set([
  'x-relay-status',
  'x-relay-error',
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
])

/** Headers that describe a request body; dropped when a redirect turns the request into a GET. */
const BODY_HEADERS = ['content-type', 'content-length', 'content-encoding', 'content-language']
/** Headers dropped when a redirect crosses to another origin (as fetch does). */
const CROSS_ORIGIN_DROP = ['authorization', 'cookie', 'proxy-authorization']

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  206: 'Partial Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  410: 'Gone',
  413: 'Content Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

/**
 * The standard reason phrase for a status (the relay does not carry the upstream's own).
 *
 * @param status - HTTP status code.
 * @returns The reason phrase, or `''` when uncommon.
 */
export function statusTextFor(status: number): string {
  return STATUS_TEXT[status] ?? ''
}

/**
 * Read an environment variable without assuming `process` exists.
 *
 * @param name - Variable name.
 * @returns Its value, or `undefined`.
 */
export function readEnv(name: string): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
  const value = g.process?.env?.[name]
  return value === undefined || value === '' ? undefined : value
}

/**
 * Base64-encode bytes, portably.
 *
 * @param bytes - The bytes.
 * @returns Standard base64 (with padding).
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Build the relay's `Authorization` header value from a credential.
 * A `<projectId>:<mac>` pair is base64-encoded (what the relay verifies); a value without
 * a colon is taken as already encoded; a leading `Basic ` is tolerated.
 *
 * @param credential - The configured credential.
 * @returns The header value, `Basic <base64>`.
 */
export function authorizationFor(credential: string): string {
  const value = credential.trim().replace(/^Basic\s+/i, '')
  const encoded = value.includes(':') ? bytesToBase64(new TextEncoder().encode(value)) : value
  return `Basic ${encoded}`
}

/** The resolved relay settings. */
export interface ResolvedRelayConfig {
  /** The relay endpoint. */
  relayUrl: URL
  /** The `Authorization` header value for the relay. */
  authorization: string
}

/**
 * Resolve the relay URL and credential from options, then the environment.
 *
 * @param options - Caller options.
 * @returns The settings.
 * @throws {RelayError} `config` when either is missing or the URL is invalid.
 */
export function resolveRelayConfig(options: RelayOptions): ResolvedRelayConfig {
  const url = options.relayUrl ?? readEnv(RELAY_URL_ENV)
  const credential = options.credential ?? readEnv(RELAY_CREDENTIAL_ENV)
  if (!url) {
    throw new RelayError(
      'config',
      `No egress relay URL is configured. Set ${RELAY_URL_ENV} or pass relayUrl.`,
    )
  }
  if (!credential) {
    throw new RelayError(
      'config',
      `No egress credential is configured. Set ${RELAY_CREDENTIAL_ENV} or pass credential.`,
    )
  }
  let relayUrl: URL
  try {
    relayUrl = new URL(url)
  } catch (error) {
    throw new RelayError('config', `${RELAY_URL_ENV} is not a valid URL.`, undefined, {
      cause: error,
    })
  }
  return { relayUrl, authorization: authorizationFor(credential) }
}

/**
 * Whether a URL addresses the relay endpoint itself (same origin and path; query ignored).
 *
 * @param url - The request URL.
 * @param relayUrl - The relay endpoint.
 * @returns `true` when the request is for the relay.
 */
export function isRelayEndpoint(url: URL, relayUrl: URL): boolean {
  const trim = (path: string): string => path.replace(/\/+$/, '')
  return url.origin === relayUrl.origin && trim(url.pathname) === trim(relayUrl.pathname)
}

/**
 * Copy the upstream's headers out of a relay answer, without the relay's own.
 *
 * @param headers - The relay answer's headers.
 * @returns The upstream headers.
 */
export function upstreamHeaders(headers: Headers): Headers {
  const out = new Headers()
  headers.forEach((value, name) => {
    if (!RELAY_RESPONSE_HEADERS.has(name.toLowerCase())) out.append(name, value)
  })
  return out
}

/**
 * Remove the request-body headers (when a redirect turns the request into a GET).
 *
 * @param headers - Headers to edit in place.
 */
export function dropBodyHeaders(headers: Headers): void {
  for (const name of BODY_HEADERS) headers.delete(name)
}

/**
 * Remove credentials that must not follow a redirect to another origin.
 *
 * @param headers - Headers to edit in place.
 */
export function dropCrossOriginHeaders(headers: Headers): void {
  for (const name of CROSS_ORIGIN_DROP) headers.delete(name)
}

/**
 * The error a fetch rejects with on abort: the signal's reason, else an `AbortError`.
 *
 * @param signal - The aborted signal.
 * @returns The rejection value.
 */
export function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('This operation was aborted', 'AbortError')
}
