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
 * import {
 *   setProvider,
 *   createSignatureRequest,
 *   processWebhook,
 * } from '@molecule/api-esign'
 * import { provider } from '@molecule/api-esign-hellosign'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Create a request from an uploaded document; persist request.id on your record
 * const request = await createSignatureRequest({
 *   title: 'Lease Agreement',
 *   signers: [{ name: 'Alice Tenant', email: 'alice@example.com', role: 'Tenant' }],
 *   document: pdfBuffer,
 * })
 *
 * // In the HTTP handler bound to the provider's webhook URL:
 * const event = await processWebhook(req.headers, req.body)
 * if (event.type === 'signature_request_all_signed') {
 *   await markContractSigned(event.signatureRequestId)
 * }
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
 * - **`getSignedDocument()` is only available once status is `'signed'`** —
 *   gate the download on status AND authorize it (only parties to the
 *   document may fetch it).
 * - Signer `email` addresses receive real vendor invitations — in development
 *   use addresses you control.
 * - Provider API keys (e.g. the HelloSign bond's `HELLOSIGN_API_KEY`) are
 *   server-side secrets resolved through the secrets registry — never
 *   hardcoded or client-visible.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './esign.js'
export * from './provider.js'
export * from './types.js'
