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
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
