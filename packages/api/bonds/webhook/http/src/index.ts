/**
 * HTTP webhook provider for molecule.dev.
 *
 * Implements the `@molecule/api-webhook` interface using direct HTTP POST
 * delivery with HMAC signature verification and automatic retries.
 *
 * @remarks
 * - **All state is in-memory.** Registrations and delivery logs live in the
 *   provider instance and are lost on restart — persist registrations in
 *   your own datastore and re-`register()` at startup. (The queue bond adds
 *   async delivery + backoff, NOT persistence — it is in-memory too.)
 * - **Signature scheme:** each delivery is a JSON POST with
 *   `x-webhook-event: <event>` and `<signatureHeader>` (default
 *   `x-webhook-signature`) set to the hex HMAC-SHA256 of the raw JSON body,
 *   keyed by the registration's secret. Receivers verify by recomputing the
 *   HMAC over the raw request body.
 * - **SSRF is enforced at connect time:** deliveries resolve DNS through a
 *   pinned lookup that refuses private/link-local/metadata addresses (no
 *   validate-then-connect rebinding window). `register()` itself does NOT
 *   validate the URL — a blocked destination surfaces as `status: 0,
 *   success: false` delivery results. Still allowlist at registration time
 *   for a friendly 4xx (see the core's remarks).
 * - `dispatch()` never throws on delivery failure — check each result's
 *   `success` (network errors/timeouts appear as `status: 0`). Retries are
 *   synchronous: `dispatch()` resolves only after all attempts finish.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-webhook'
 * import { createProvider } from '@molecule/api-webhook-http'
 *
 * // Bond at startup
 * setProvider(createProvider())
 *
 * // Or with custom configuration
 * setProvider(createProvider({
 *   timeout: 10_000,
 *   retryCount: 5,
 *   retryDelay: 2000,
 * }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './safe-fetch.js'
export * from './types.js'
