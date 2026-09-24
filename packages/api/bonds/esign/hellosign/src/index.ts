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
 * import { createSignatureRequest, getSignatureRequest, setProvider } from '@molecule/api-esign'
 * import { provider } from '@molecule/api-esign-hellosign'
 *
 * // Startup: bond once. Env: HELLOSIGN_API_KEY (Dropbox Sign → Settings → API).
 * setProvider(provider)
 *
 * // Every request is a REAL send — signers get an email from Dropbox Sign.
 * const request = await createSignatureRequest({
 *   title: 'Consulting Agreement',
 *   message: 'Please review and sign.',
 *   signers: [{ name: 'Ada Lovelace', email: 'ada@example.com' }],
 *   document: { url: 'https://files.example.com/contracts/consulting.pdf' },
 * })
 * // { id: 'fa5c8a0b…', status: 'awaiting_signatures', signers: [{ …, status: 'pending' }] }
 *
 * const latest = await getSignatureRequest(request.id)
 * console.log(latest.status) // 'awaiting_signatures' | 'signed' | 'declined' | 'cancelled'
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
 *   There is no `createProvider()` — the key comes only from the environment.
 * - `document` is a `Buffer` (multipart upload, sent as `document.pdf`), a hosted
 *   `{ url }` HelloSign can fetch, or `{ templateId, prefill }`; with a template, each
 *   signer's `role` must match a template role (it defaults to `Signer 1`, `Signer 2`, …).
 * - Webhook `signatureRequestId` / `signerEmail` come from the payload; the headers argument
 *   of `processWebhook()` is ignored (the HMAC lives in `event.event_hash` inside the body).
 *
 * @see https://developers.hellosign.com/api/reference/
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
