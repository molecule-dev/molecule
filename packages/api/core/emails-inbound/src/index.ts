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
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
