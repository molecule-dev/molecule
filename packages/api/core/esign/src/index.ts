/**
 * E-signature core interface for molecule.dev.
 *
 * Defines the {@link EsignProvider} interface for the signature-request
 * lifecycle: create a request (from a raw `Buffer`, a hosted `{ url }`, or a
 * vendor `{ templateId, prefill }` document), poll its status, cancel it,
 * download the signed PDF, and normalize inbound webhook events. Bond
 * packages (HelloSign / Dropbox Sign, DocuSign, OpenSign, Adobe Sign, etc.)
 * implement this interface; application code uses the convenience functions
 * (`createSignatureRequest`, `getSignatureRequest`, `cancelSignatureRequest`,
 * `getSignedDocument`, `processWebhook`) which delegate to the bonded
 * provider.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { createSignatureRequest, processWebhook, setProvider } from '@molecule/api-esign'
 * // Needs HELLOSIGN_API_KEY. Sends are LIVE — signers receive real emails.
 * import { provider as hellosign } from '@molecule/api-esign-hellosign'
 *
 * // Startup: bond once.
 * setProvider(hellosign)
 *
 * // Your contract records — in an app, a DataStore table keyed by the request id.
 * const contracts = new Map<string, { title: string; status: string }>()
 *
 * // Signing happens LATER on the vendor's site: store the id; status is 'awaiting_signatures'.
 * const request = await createSignatureRequest({
 *   title: 'Lease Agreement',
 *   signers: [{ name: 'Alice Tenant', email: 'alice@example.com', role: 'Tenant' }],
 *   document: { url: 'https://files.example.com/lease.pdf', filename: 'lease.pdf' },
 * })
 * contracts.set(request.id, { title: 'Lease Agreement', status: request.status })
 *
 * const app = express()
 * // Dropbox Sign posts form-encoded `json=...`; processWebhook verifies it and THROWS if forged.
 * app.post('/webhooks/esign', express.urlencoded({ extended: false }), async (req, res) => {
 *   const event = await processWebhook(req.headers, req.body).catch((error: unknown) => {
 *     console.warn('Rejected e-sign webhook', error)
 *     return null
 *   })
 *   if (!event) {
 *     res.status(400).end()
 *     return
 *   }
 *   const contract = contracts.get(event.signatureRequestId)
 *   if (contract && event.type === 'signature_request_all_signed') contract.status = 'signed'
 *   res.status(200).send('Hello API Event Received') // the exact body Dropbox Sign expects
 * })
 * app.listen(3000)
 * ```
 *
 * @remarks
 * - **Signing is asynchronous, on the vendor's site.** Never mark a document
 *   signed when the request is created. Persist the provider-issued
 *   `SignatureRequest.id` on your record and update status from
 *   `processWebhook` events (or `getSignatureRequest()` polling).
 * - **`processWebhook` verifies authenticity and THROWS on a bad signature.**
 *   The webhook endpoint is public — let that rejection become a 4xx and never
 *   touch the event body first. Treat `type: 'unknown'` as ignorable (2xx),
 *   not an error.
 * - **Bond first** with `setProvider(provider)` — every function throws until then. The
 *   webhook body format is the vendor's: the HelloSign bond needs a urlencoded parser
 *   (`{ json: '...' }`, not a raw/JSON body) and a 200 reply with the literal text
 *   `Hello API Event Received`, or Dropbox Sign keeps retrying and disables the callback.
 * - **`getSignedDocument()` is only available once status is `'signed'`** —
 *   gate the download on status AND authorize it (only parties to the
 *   document may fetch it).
 * - Signer `email` addresses receive real vendor invitations — in development
 *   use addresses you control.
 * - Provider API keys (e.g. the HelloSign bond's `HELLOSIGN_API_KEY`) are
 *   server-side secrets resolved through the secrets registry — never
 *   hardcoded or client-visible.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The send-for-signature flow creates a real request: picking a document
 *   and adding signer(s) in the UI calls `createSignatureRequest`, the app
 *   persists the returned `SignatureRequest.id` on its record, and the document
 *   shows as `awaiting_signatures` — NOT marked signed at creation.
 * - [ ] The signer invitation actually leaves the app. The sandbox CAPTURES the
 *   outbound vendor invitation instead of emailing — read it with the
 *   `read_activity` tool (filter type 'email'); the signing link is in its
 *   payload. Never mock the flow or expect a real inbox.
 * - [ ] COUNTERPARTY (the signing itself completes out-of-band on the vendor's
 *   hosted site, which can't be driven in-sandbox): verify completion against
 *   the app's OWN stored envelope state — deliver a `signature_request_all_signed`
 *   event to the webhook endpoint (or poll `getSignatureRequest`) and confirm the
 *   document flips `awaiting_signatures` → `signed` and the signer flips
 *   `pending` → `signed`. Observe the transition, never guess it.
 * - [ ] The signed PDF is retrievable only after completion: `getSignedDocument`
 *   returns the document once status is `signed`, and the UI download is gated on
 *   that status (unavailable/denied while the request is still awaiting signatures).
 * - [ ] `processWebhook` rejects a forged callback — a bad signature THROWS and
 *   becomes a 4xx with no state change; a `type: 'unknown'` event is ignored (2xx).
 * - [ ] AUTHORIZATION — only the request owner / a party to the document can view
 *   its status or download the signed PDF; no endpoint lets a caller fetch or act
 *   on someone else's `SignatureRequest.id` by guessing it.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './esign.js'
export * from './provider.js'
export * from './types.js'
