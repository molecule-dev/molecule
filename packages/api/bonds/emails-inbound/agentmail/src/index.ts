/**
 * AgentMail inbound-email provider for molecule.dev.
 *
 * Implements `@molecule/api-emails-inbound`'s `InboundEmailProvider`
 * interface against AgentMail's `message.received` webhook. Verifies the
 * Svix signature headers (`svix-id` / `svix-timestamp` / `svix-signature`,
 * HMAC-SHA256 over `id.timestamp.body` keyed by the `whsec_` secret) with
 * replay protection, normalizes the JSON payload, hydrates through the
 * AgentMail API what the webhook leaves out (attachment bytes; bodies over
 * the 1 MB cap), and replies through AgentMail's own reply endpoint. Built
 * on the global `fetch` — no SDK.
 *
 * @remarks
 * - **The webhook route is PUBLIC and needs the RAW body.** Mount it outside
 *   any auth middleware and hand `verifySignature()` the exact bytes
 *   received — `express.raw({ type: 'application/json' })` on that route, or
 *   the body-parser bond's `req.rawBody`. A body that went through
 *   `express.json()` and was re-stringified will NOT verify.
 * - **Nothing arrives until BOTH exist at AgentMail: the inbox
 *   (`POST /v0/inboxes`) and a webhook registered for it
 *   (`POST /v0/webhooks` with `url` + `event_types: ['message.received']`,
 *   optionally scoped by `inbox_ids`).** The create-webhook response's
 *   `secret` IS `AGENTMAIL_WEBHOOK_SECRET`. Subscribe this URL to
 *   `message.received*` only — any other event type (`message.sent`,
 *   `message.bounced`, …) makes `parseWebhookPayload()` throw.
 * - `verifySignature()` THROWS the tagged `config.notConfigured` error
 *   (→ 503 via the API error middleware) when `AGENTMAIL_WEBHOOK_SECRET` is
 *   unset, and resolves `false` for a missing/stale/forged signature. Let the
 *   throw propagate — mapping it to the same 401 as a forged webhook hides a
 *   misconfigured server behind "invalid signature".
 * - **`parseWebhookPayload()` may call the AgentMail API.** Attachments
 *   arrive as metadata only and are downloaded (metadata → presigned
 *   `download_url` → bytes); when both `text` and `html` are missing (the
 *   1 MB payload cap) the message is fetched. Both need
 *   `AGENTMAIL_API_KEY` (tagged config error if unset) and count against
 *   AgentMail's per-key rate limit. A `429` surfaces as an
 *   `AgentMailApiError` with `retryAfterSeconds` — let it propagate as a
 *   5xx so AgentMail redelivers later; never swallow it into a 200, which
 *   loses the mail. A message with bodies and no attachments makes no
 *   network call.
 * - **Replies use AgentMail's reply endpoint, not `@molecule/api-emails`.**
 *   The reply is sent from the inbox that received the message and AgentMail
 *   threads it itself, so `reply.subject` and `reply.from` are ignored. The
 *   inbox is resolved from `AGENTMAIL_INBOX_ID`, else from the in-process
 *   record `parseWebhookPayload()` kept — set `AGENTMAIL_INBOX_ID` whenever
 *   a reply is sent from a later request or after a restart. When set it
 *   also makes `parseWebhookPayload()` reject events for any other inbox.
 * - `InboundEmail.id` is AgentMail's `message_id` verbatim — the Message-ID
 *   INCLUDING angle brackets, which is also the path parameter of every
 *   per-message endpoint; `messageId` is the same value without brackets.
 *   Dedupe on `id`.
 * - The sender field is documented under two spellings (`from` in the API
 *   reference, `from_` in the webhooks guide); both are read.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-emails-inbound'
 * import { provider as agentMailInbound } from '@molecule/api-emails-inbound-agentmail'
 *
 * setProvider(agentMailInbound)
 * ```
 *
 * @module
 */

export * from './api.js'
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './utilities.js'
