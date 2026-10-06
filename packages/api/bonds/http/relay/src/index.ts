/**
 * Egress relay HTTP client for molecule.dev — outbound HTTP for runtimes that cannot dial out.
 *
 * A server running in a user's browser (or any runtime without raw sockets) cannot call
 * Stripe, Anthropic or any other REST API directly: cross-origin rules refuse it. The
 * molecule.dev platform serves a relay (`POST /api/egress-relay`) that makes the request
 * under the project's egress credential and allowlist. This package is its client, in two
 * forms:
 *
 * - `provider` — an `@molecule/api-http` client: `setClient(provider)` and every
 *   `get`/`post`/… call goes through the relay.
 * - `installRelayFetch()` — replaces `globalThis.fetch`, so vendor SDKs that call `fetch`
 *   (Stripe, Anthropic, OpenAI…) go through the relay unchanged. Returns `uninstall()`.
 *
 * Both read `MOLECULE_EGRESS_RELAY_URL` and `MOLECULE_EGRESS_CREDENTIAL` unless
 * `relayUrl` / `credential` are passed.
 *
 * @example
 * ```typescript
 * import { setClient } from '@molecule/api-http'
 * import { installRelayFetch, isRelayError, provider } from '@molecule/api-http-relay'
 *
 * // 1. The @molecule/api-http client.
 * setClient(provider)
 *
 * // 2. Or patch fetch for every library at once (call once at startup).
 * const relay = installRelayFetch()
 *
 * try {
 *   const res = await fetch('https://api.stripe.com/v1/charges', {
 *     method: 'POST',
 *     headers: { Authorization: `Bearer ${stripeKey}` },
 *     body: new URLSearchParams({ amount: '100', currency: 'usd' }),
 *   })
 *   console.log(res.status, await res.json()) // the upstream's real status and body
 * } catch (error) {
 *   // The relay's own refusal, verbatim, e.g. a 403 naming the blocked host.
 *   if (isRelayError(error) && error.kind === 'refused') console.error(error.status, error.message)
 * }
 *
 * relay.uninstall() // restores the previous fetch
 * ```
 *
 * @remarks
 * - **Bodies are buffered, never streamed.** The relay carries the whole request body as
 *   base64 in JSON (5 MB limit) and returns the whole response (10 MB limit, 30 s per
 *   request). A `ReadableStream` request body is REJECTED with a `RelayError`
 *   (`kind: 'unsupported'`) rather than silently truncated — buffer it into a string,
 *   `Uint8Array`, `Blob`, `FormData` or `URLSearchParams` first. Response bodies arrive
 *   complete, so streaming APIs (server-sent events, `stream: true` AI calls) only deliver
 *   once the upstream finishes; prefer their non-streaming mode.
 * - **Redirects are followed by THIS client, through the relay**, never by the relay and
 *   never directly: 301/302/303 become a GET without a body (HEAD stays HEAD), 307/308 keep
 *   method and body, at most 5 hops (`maxRedirects`), a hop to a non-http(s) URL is refused,
 *   and `Authorization`/`Cookie` are dropped when a redirect changes origin. `redirect:
 *   'manual'` returns the 3xx `Response` itself; `redirect: 'error'` rejects.
 * - **A relay refusal throws `RelayError`** (a `TypeError` subclass, so code that catches
 *   fetch failures still works). `kind: 'refused'` carries the relay's own message verbatim
 *   and its HTTP status: 401 (missing or invalid credential), 403 (the egress policy blocked
 *   the host — the message names it; the project owner can allow it), 429 (too many requests
 *   in flight), 502 (upstream unreachable, too slow or too large), 400/413 (bad or oversize
 *   request). An upstream error status (a Stripe 402, an API 500) is NOT a `RelayError`: the
 *   `Response` simply has that status (and the `@molecule/api-http` provider throws its usual
 *   `HttpError` for non-2xx).
 * - Allowed methods are the relay's: GET, HEAD, POST, PUT, PATCH, DELETE; ports 80 and 443
 *   only; no credentials embedded in the URL. `Set-Cookie` never comes back.
 * - Non-http(s) URLs (`data:`, `blob:`), requests to the relay URL itself and URLs matched
 *   by the `bypass` option go to the original fetch untouched.
 * - `Response.statusText` is the standard reason phrase for the status (the relay does not
 *   carry the upstream's own wording).
 * - The credential and request bodies are never logged.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './errors.js'
export * from './provider.js'
export * from './relay-fetch.js'
export * from './secrets.js'
export * from './types.js'
export * from './utilities.js'
