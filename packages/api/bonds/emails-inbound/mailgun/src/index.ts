/**
 * Mailgun Routes inbound-email provider for molecule.dev.
 *
 * Implements `@molecule/api-emails-inbound`'s `InboundEmailProvider`
 * interface against Mailgun's parsed-email POST format. Verifies the
 * `timestamp`/`token`/`signature` triple via HMAC-SHA256 against
 * `MAILGUN_API_KEY`, rejecting payloads older than the configured replay
 * window.
 *
 * Outbound replies compose onto the bonded `@molecule/api-emails`
 * transport (typically `@molecule/api-emails-mailgun`) — this package does
 * not reimplement the SMTP path.
 *
 * @remarks
 * - **Replies need an OUTBOUND transport bonded** (`setTransport(...)` from
 *   `@molecule/api-emails`, typically `@molecule/api-emails-mailgun`); this package does not
 *   send mail itself. Without it `replyTo()` throws. When `reply.from` is omitted the reply is
 *   sent from the original message's first `To:` address.
 * - **Only `application/x-www-form-urlencoded` bodies are parsed.** A `multipart/form-data` POST
 *   is not decoded (its signing fields are not found, so `verifySignature()` returns `false`);
 *   attachments are read only from the form-encoded `attachment-N` JSON fields. Hand
 *   `verifySignature()` the raw bytes — `express.urlencoded()` output re-stringified is not
 *   what Mailgun signed.
 * - **The HMAC key is `MAILGUN_API_KEY`** (HMAC-SHA256 of `timestamp + token`). Mailgun signs
 *   with the account's HTTP webhook signing key; where that differs from the API key, every
 *   webhook verifies `false` (401) — compare both in Mailgun's API Security settings. The replay
 *   window is `MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS` (seconds, default 300).
 *
 * `verifySignature` THROWS the tagged `config.notConfigured` error (→ 503
 * via the API error middleware) when `MAILGUN_API_KEY` is unset, instead of
 * returning `false` like every other verification failure. Wire your
 * webhook handler to let that throw propagate to the error middleware —
 * catching it and mapping to the same 401 as a forged/stale webhook
 * re-introduces the "every failure looks the same" ambiguity this was
 * fixed to remove.
 *
 * When an inbound message has no `Message-Id`, `id` is a deterministic
 * hash of the sender/original-Date-header/subject (NOT the per-request
 * Mailgun signing token, which changes on every retry) — so retries of an
 * id-less message still dedupe to the same id.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setTransport } from '@molecule/api-emails'
 * import {
 *   parseWebhookPayload,
 *   replyTo,
 *   setProvider,
 *   verifySignature,
 * } from '@molecule/api-emails-inbound'
 * import { provider as mailgunRoutes } from '@molecule/api-emails-inbound-mailgun'
 * import { provider as mailgunTransport } from '@molecule/api-emails-mailgun'
 *
 * // Startup: bond both. Env: MAILGUN_API_KEY (verifies AND sends), MAILGUN_DOMAIN.
 * setProvider(mailgunRoutes)
 * setTransport(mailgunTransport) // replyTo() sends through the OUTBOUND emails bond
 *
 * const app = express()
 *
 * // PUBLIC route (Mailgun Route action: forward("https://api.example.com/webhooks/mailgun")),
 * // RAW form body — register it BEFORE any global body parser.
 * app.post(
 *   '/webhooks/mailgun',
 *   express.raw({ type: 'application/x-www-form-urlencoded' }),
 *   async (req, res) => {
 *     // Throws (→ 503) when MAILGUN_API_KEY is unset; false = forged/stale → 401.
 *     if (!(await verifySignature(req.headers, req.body))) {
 *       res.status(401).end()
 *       return
 *     }
 *     const email = await parseWebhookPayload(req.headers, req.body)
 *     console.log(email.id, email.from, email.subject, email.textBody)
 *
 *     // Threaded via In-Reply-To/References; `from` must be on MAILGUN_DOMAIN.
 *     await replyTo(email, {
 *       from: `support@${process.env.MAILGUN_DOMAIN}`,
 *       textBody: `Thanks, we received "${email.subject}".`,
 *     })
 *     res.status(200).end()
 *   },
 * )
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
