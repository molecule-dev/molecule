/**
 * A `fetch` that sends every http(s) request through the molecule.dev egress relay,
 * and `installRelayFetch`, which puts it in place of `globalThis.fetch`.
 *
 * Protocol (served at `POST /api/egress-relay`): the client POSTs JSON
 * `{ url, method, headers, bodyBase64? }` with `Authorization: Basic <credential>`. An
 * upstream answer comes back as HTTP 200 with the upstream's headers and body and its real
 * status in `X-Relay-Status`. A non-200 carrying `X-Relay-Error: 1` is the relay's own
 * refusal, with `{ error }` in plain words. The relay never follows redirects; this client
 * follows them by sending each next hop through the relay again.
 *
 * @module
 */

import { RelayError } from './errors.js'
import type { RelayFetch, RelayFetchInstallation, RelayOptions } from './types.js'
import {
  abortReason,
  bytesToBase64,
  DEFAULT_MAX_REDIRECTS,
  dropBodyHeaders,
  dropCrossOriginHeaders,
  isRelayEndpoint,
  NULL_BODY_STATUSES,
  REDIRECT_STATUSES,
  type ResolvedRelayConfig,
  resolveRelayConfig,
  statusTextFor,
  upstreamHeaders,
} from './utilities.js'

/** One request as it is sent through the relay. */
interface RelayHop {
  url: URL
  method: string
  headers: Headers
  body: Uint8Array | null
}

/** What the relay returned for one hop. */
interface RelayAnswer {
  status: number
  headers: Headers
  body: Uint8Array<ArrayBuffer>
}

/**
 * Whether a value is a `Request` (checked structurally, so a Request from another realm counts).
 *
 * @param input - The first fetch argument.
 * @returns `true` for a Request.
 */
function isRequest(input: unknown): input is Request {
  if (typeof Request !== 'undefined' && input instanceof Request) return true
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof (input as Request).url === 'string' &&
    typeof (input as Request).method === 'string' &&
    typeof (input as Request).arrayBuffer === 'function'
  )
}

/**
 * Whether a body is a `ReadableStream` (which the relay cannot carry: it buffers).
 *
 * @param body - A fetch body init.
 * @returns `true` for a stream.
 */
function isReadableStream(body: unknown): boolean {
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return true
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ReadableStream).getReader === 'function' &&
    typeof (body as ReadableStream).pipeTo === 'function'
  )
}

/**
 * Resolve the target URL of a fetch call.
 *
 * @param input - The first fetch argument.
 * @returns The URL, or `null` when it cannot be parsed (the underlying fetch then reports it).
 */
function targetUrl(input: string | URL | Request): URL | null {
  const raw = isRequest(input) ? input.url : input instanceof URL ? input.href : String(input)
  const base = (globalThis as { location?: { href?: string } }).location?.href
  try {
    return new URL(raw, base)
  } catch (_error) {
    // Intentionally ignored: an unparseable URL is handed to the underlying fetch unchanged,
    // which rejects it with its own standard TypeError.
    return null
  }
}

/**
 * Turn a fetch call into the method, headers and buffered body the relay carries.
 *
 * @param input - The first fetch argument.
 * @param init - The second fetch argument.
 * @param url - The resolved target.
 * @returns The first hop plus the call's signal and redirect mode.
 */
async function prepare(
  input: string | URL | Request,
  init: RequestInit | undefined,
  url: URL,
): Promise<{ hop: RelayHop; signal: AbortSignal | null; redirect: RequestRedirect }> {
  const request = isRequest(input) ? input : null
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
  const headers = new Headers(init?.headers ?? request?.headers ?? undefined)
  const signal = init && 'signal' in init ? (init.signal ?? null) : (request?.signal ?? null)
  const redirect: RequestRedirect = init?.redirect ?? request?.redirect ?? 'follow'
  if (signal?.aborted) throw abortReason(signal)

  let body: Uint8Array | null = null
  if (init?.body !== undefined && init.body !== null) {
    if (isReadableStream(init.body)) {
      throw new RelayError(
        'unsupported',
        'A streaming (ReadableStream) request body cannot be sent through the egress relay. ' +
          'Buffer it first (a string, ArrayBuffer, Uint8Array, Blob, FormData or URLSearchParams).',
      )
    }
    // A Response extracts any body init into bytes and its implied Content-Type
    // (FormData boundary, URLSearchParams, Blob type, text) exactly as fetch would.
    const extracted = new Response(init.body)
    body = new Uint8Array(await extracted.arrayBuffer())
    const implied = extracted.headers.get('content-type')
    if (implied && !headers.has('content-type')) headers.set('content-type', implied)
  } else if (init?.body === undefined && request && request.body !== null) {
    body = new Uint8Array(await request.arrayBuffer())
  }
  if (body !== null && (method === 'GET' || method === 'HEAD')) {
    throw new TypeError('Request with GET/HEAD method cannot have body.')
  }
  return { hop: { url, method, headers, body }, signal, redirect }
}

/**
 * Read the relay's own refusal message: the `error` field of its JSON, else the raw text.
 *
 * @param response - The relay's non-200 answer.
 * @returns The message, verbatim.
 */
async function refusalMessage(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text) as { error?: unknown }
    if (typeof parsed.error === 'string' && parsed.error) return parsed.error
  } catch (_error) {
    // Intentionally ignored: a non-JSON refusal is reported as its raw text below.
  }
  return text.trim() || `The egress relay refused the request (HTTP ${response.status}).`
}

/**
 * Send one hop through the relay.
 *
 * @param transport - The fetch that reaches the relay.
 * @param config - Relay URL and authorization.
 * @param hop - The request.
 * @param signal - Abort signal for the call.
 * @returns The upstream's status, headers and body.
 */
async function sendHop(
  transport: typeof fetch,
  config: ResolvedRelayConfig,
  hop: RelayHop,
  signal: AbortSignal | null,
): Promise<RelayAnswer> {
  const headers: Record<string, string> = {}
  hop.headers.forEach((value, name) => {
    headers[name] = value
  })
  const payload: Record<string, unknown> = { url: hop.url.href, method: hop.method, headers }
  if (hop.body !== null) payload.bodyBase64 = bytesToBase64(hop.body)

  let response: Response
  try {
    response = await transport(config.relayUrl.href, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: config.authorization },
      body: JSON.stringify(payload),
      signal,
      redirect: 'manual',
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new RelayError('unavailable', 'The egress relay could not be reached.', undefined, {
      cause: error,
    })
  }

  const relayError = response.headers.get('x-relay-error')
  if (relayError === '1') {
    throw new RelayError('refused', await refusalMessage(response), response.status)
  }
  if (response.status !== 200) {
    await response.body?.cancel()
    throw new RelayError(
      'unavailable',
      `The egress relay answered HTTP ${response.status} without a relay error; it may be down or the URL may be wrong.`,
      response.status,
    )
  }
  const statusHeader = response.headers.get('x-relay-status')
  const status = Number(statusHeader)
  if (!statusHeader || !Number.isInteger(status) || status < 200 || status > 599) {
    await response.body?.cancel()
    throw new RelayError(
      'protocol',
      'The egress relay answered without a valid X-Relay-Status header; check that the relay URL points at the relay.',
      response.status,
    )
  }
  const body = new Uint8Array(await response.arrayBuffer())
  return { status, headers: upstreamHeaders(response.headers), body }
}

/**
 * Build the `Response` the caller sees.
 *
 * @param answer - The final hop's answer.
 * @param hop - The final hop.
 * @param redirected - Whether any redirect was followed.
 * @returns A standard Response with `url` and `redirected` set.
 */
function toResponse(answer: RelayAnswer, hop: RelayHop, redirected: boolean): Response {
  const nullBody = hop.method === 'HEAD' || NULL_BODY_STATUSES.has(answer.status)
  const response = new Response(nullBody ? null : answer.body, {
    status: answer.status,
    statusText: statusTextFor(answer.status),
    headers: answer.headers,
  })
  Object.defineProperty(response, 'url', { value: hop.url.href, enumerable: true })
  Object.defineProperty(response, 'redirected', { value: redirected, enumerable: true })
  return response
}

/**
 * Send a request through the relay, following redirects the way fetch does.
 *
 * @param transport - The fetch that reaches the relay.
 * @param config - Relay URL and authorization.
 * @param first - The first hop.
 * @param signal - Abort signal.
 * @param redirect - The fetch redirect mode.
 * @param maxRedirects - Most redirects followed.
 * @returns The final Response.
 */
async function relayWithRedirects(
  transport: typeof fetch,
  config: ResolvedRelayConfig,
  first: RelayHop,
  signal: AbortSignal | null,
  redirect: RequestRedirect,
  maxRedirects: number,
): Promise<Response> {
  let hop = first
  let redirected = false
  for (let followed = 0; ; followed++) {
    if (signal?.aborted) throw abortReason(signal)
    const answer = await sendHop(transport, config, hop, signal)
    const location = answer.headers.get('location')
    if (!REDIRECT_STATUSES.has(answer.status) || location === null) {
      return toResponse(answer, hop, redirected)
    }
    if (redirect === 'manual') return toResponse(answer, hop, redirected)
    if (redirect === 'error') {
      throw new RelayError(
        'redirect',
        `The server answered with a redirect (HTTP ${answer.status}) and redirect is set to "error".`,
      )
    }
    if (followed >= maxRedirects) {
      throw new RelayError('redirect', `Too many redirects (more than ${maxRedirects}).`)
    }
    let next: URL
    try {
      next = new URL(location, hop.url)
    } catch (error) {
      throw new RelayError('redirect', 'The redirect location is not a valid URL.', undefined, {
        cause: error,
      })
    }
    if (next.protocol !== 'http:' && next.protocol !== 'https:') {
      throw new RelayError('redirect', `A redirect to a ${next.protocol} URL cannot be followed.`)
    }
    const headers = new Headers(hop.headers)
    let method = hop.method
    let body = hop.body
    if (
      (answer.status === 301 || answer.status === 302 || answer.status === 303) &&
      method !== 'HEAD'
    ) {
      method = 'GET'
      body = null
      dropBodyHeaders(headers)
    }
    if (next.origin !== hop.url.origin) dropCrossOriginHeaders(headers)
    hop = { url: next, method, headers, body }
    redirected = true
  }
}

/**
 * Create a fetch-compatible function that sends every http(s) request through the relay.
 * Non-http(s) URLs, the relay URL itself and URLs matched by `bypass` go to the underlying
 * fetch unchanged. Configuration is read on each call (options first, then the environment).
 *
 * @param options - Relay URL, credential, underlying fetch, redirect limit, bypass.
 * @returns The relay fetch.
 */
export function createRelayFetch(options: RelayOptions = {}): RelayFetch {
  const transport = options.fetch ?? globalThis.fetch
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  return async function relayFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const url = targetUrl(input)
    if (url === null || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
      return transport(input, init)
    }
    const config = resolveRelayConfig(options)
    if (isRelayEndpoint(url, config.relayUrl) || options.bypass?.(url)) {
      return transport(input, init)
    }
    const { hop, signal, redirect } = await prepare(input, init, url)
    return relayWithRedirects(transport, config, hop, signal, redirect, maxRedirects)
  }
}

/**
 * Replace `globalThis.fetch` with the relay fetch. Throws at once when no relay URL or
 * credential is configured, rather than on the first request.
 *
 * @param options - Relay URL, credential, underlying fetch, redirect limit, bypass.
 * @returns The installed fetch and an `uninstall()` that restores the previous one (only if
 *   nothing replaced it since).
 */
export function installRelayFetch(options: RelayOptions = {}): RelayFetchInstallation {
  resolveRelayConfig(options)
  const previous = globalThis.fetch
  const relayFetch = createRelayFetch({ ...options, fetch: options.fetch ?? previous })
  globalThis.fetch = relayFetch as typeof fetch
  let installed = true
  return {
    fetch: relayFetch,
    uninstall(): void {
      if (!installed) return
      installed = false
      if (globalThis.fetch === relayFetch) globalThis.fetch = previous
    },
  }
}
