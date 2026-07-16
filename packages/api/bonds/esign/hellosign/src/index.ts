/**
 * HelloSign (Dropbox Sign) e-signature provider for molecule.dev.
 *
 * Implements the `@molecule/api-esign` `EsignProvider` contract against the
 * HelloSign v3 REST API: create signature requests (raw `Buffer` upload,
 * hosted `{ url }`, or `{ templateId, prefill }` template), poll status,
 * cancel, download the signed PDF, and verify + normalize webhook events
 * (HMAC-SHA256, keyed by the API key).
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-esign'
 * import { provider } from '@molecule/api-esign-hellosign'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Webhook provisioning is manual.** Configure the callback URL in the
 *   Dropbox Sign dashboard (Settings → API → Account callback) — this bond
 *   does not register it. Events arrive `application/x-www-form-urlencoded`
 *   with a single `json` field: mount the route with a urlencoded (or
 *   multipart) body parser — NOT a raw-body or JSON parser — and pass the
 *   parsed `{ json: '...' }` object to `processWebhook()`.
 * - **Respond with the literal text `Hello API Event Received` (HTTP 200)**
 *   after `processWebhook()` succeeds — Dropbox Sign treats any other
 *   response body as a failed delivery, retries, and eventually disables
 *   the callback.
 * - **Live sends only — there is no test-mode switch.** The bond never sends
 *   `test_mode=1`, so every request is a real (billable) signature request;
 *   free/trial accounts get a 4xx on send, and signers receive real emails —
 *   use addresses you control in development.
 * - Requires `HELLOSIGN_API_KEY` (read lazily at call time; never echoed
 *   into error messages). A missing key throws at first use, not at import.
 *
 * @see https://developers.hellosign.com/api/reference/
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
