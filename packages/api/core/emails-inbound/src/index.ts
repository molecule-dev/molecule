/**
 * Provider-agnostic inbound-emails interface for molecule.dev.
 *
 * Defines the {@link InboundEmailProvider} interface for receiving and
 * replying to email-to-ticket / email-to-reply traffic. Bond packages
 * (Mailgun Routes, SES Inbound, etc.) implement this interface.
 * Application code uses the convenience functions (`parseWebhookPayload`,
 * `verifySignature`, `replyTo`, `supportsReply`) which delegate to the
 * bonded provider.
 *
 * Webhook payloads vary wildly between providers; the contract here
 * normalizes them to a single {@link InboundEmail} shape so handler code
 * does not need to branch by provider.
 *
 * @example
 * ```typescript
 * import {
 *   setProvider,
 *   parseWebhookPayload,
 *   verifySignature,
 * } from '@molecule/api-emails-inbound'
 * import { provider as mailgunInbound } from '@molecule/api-emails-inbound-mailgun'
 *
 * setProvider(mailgunInbound)
 *
 * // In an HTTP handler bound to the inbound webhook URL:
 * const ok = await verifySignature(req.headers, req.rawBody)
 * if (!ok) return res.status(401).end()
 *
 * const email = await parseWebhookPayload(req.headers, req.rawBody)
 * await createTicketFromEmail(email)
 * ```
 *
 * @remarks
 * The inbound webhook endpoint is PUBLIC and unauthenticated — treat every
 * request as forgeable:
 *
 * - **Verify BEFORE trusting: `verifySignature()` first, then
 *   `parseWebhookPayload()`.** Reject failures with a 401 — never create
 *   tickets/replies from an unverified payload.
 * - **Signature verification needs the EXACT bytes received.** Wire the route
 *   so the raw request body is available (the fleet's Express body-parser bond
 *   exposes `req.rawBody`; on other stacks capture the raw body alongside
 *   parsing). A re-serialized/parsed-then-stringified body breaks HMAC
 *   verification.
 * - **Don't map every failure to 401.** A thrown tagged configuration error
 *   (e.g. unset signing key) is a server misconfiguration — let it propagate
 *   to error middleware (→ 503) instead of catching it into the same 401 a
 *   forged webhook gets.
 * - **Replying is optional per provider.** Check `supportsReply()` before
 *   `replyTo()` (which throws otherwise), and reply dispatch composes onto the
 *   outbound `@molecule/api-emails` bond — wire a transport or replies fail.
 * - Respond 2xx promptly once verified and make handling idempotent (dedupe on
 *   `InboundEmail.messageId`) — providers retry slow or 5xx webhooks.
 *
 * @e2e
 * Integration checklist — drive the real inbound endpoint (live preview, no
 * mocks), adapt each item to this app's actual inbox/ticket/thread flows, and
 * check every box off one by one. A box you can't check is an integration bug
 * to fix — not a skip. COUNTERPARTY: the app can't receive a real email in the
 * sandbox, so YOU play the mail provider — POST a realistic inbound-email
 * webhook to the app's inbound endpoint with `sandbox_fetch` (curl runs inside
 * the container). Model the payload on the BONDED provider's real format
 * (Mailgun: form fields `sender`/`recipient`/`subject`/`body-plain`/`body-html`/
 * `attachment-N` plus the `timestamp`/`token`/`signature` triple; SES/Postmark:
 * their JSON), and the happy-path POST must carry a VALID signature — compute it
 * the way the provider does (Mailgun signs HMAC-SHA256 of `timestamp+token` with
 * `MAILGUN_API_KEY` inside the replay window; read the key from the Environment
 * panel / `.env.molecule`). Never disable `verifySignature()` or mock
 * `parseWebhookPayload()` to go green — that proves nothing.
 * - [ ] A signed sample webhook to the inbound endpoint parses into the
 *   normalized fields (from / to / subject / textBody / htmlBody) AND the app
 *   ACTS on it — it files the mail into the right place (creates a ticket, a
 *   comment on a thread, or a reply-thread) keyed off the recipient (`support@`)
 *   or a plus-address / thread token (`reply+<id>@`). Verify the CREATED record
 *   (a DB row, and it shows up in the UI) — not just a 200.
 * - [ ] Routing is correct: an email to `support@` opens a NEW ticket, while
 *   `reply+<id>@` (or an `In-Reply-To` / `References` match) threads onto the
 *   EXISTING one — each lands in the right user's / conversation's place, never
 *   a stranger's.
 * - [ ] Attachments survive: an inbound message with an attachment has it
 *   decoded from `attachments[].contentBase64` and stored on the app's OWN
 *   storage (the uploads bond), not left as a provider link — the stored file
 *   opens from the ticket.
 * - [ ] Retries don't duplicate: re-POST the SAME webhook (providers retry slow
 *   / 5xx deliveries) and confirm handling is idempotent — one ticket, not two
 *   (dedupe on `id` / `messageId`).
 * - [ ] Malformed / empty payloads (missing `body-plain`, no attachments, absent
 *   headers) are handled without a crash — a clean response, not a 500 stack
 *   trace.
 * - [ ] SECURITY — the endpoint is AUTHENTICATED: a forged POST with a bad or
 *   missing signature (or a `timestamp` outside the replay window) is REJECTED
 *   (401) and creates NO record, so an attacker can't inject mail into another
 *   user's thread. A missing signing key is a DISTINCT 503, not a 401 — a
 *   server misconfig must not masquerade as an accepted or forged webhook.
 * - [ ] SECURITY — the parsed `htmlBody` is sanitized before it is rendered
 *   anywhere: a `<script>` / `onerror=` in an inbound body must NOT execute when
 *   the ticket is viewed (no stored XSS from an inbound email body).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
