/**
 * AWS SES inbound-email provider for molecule.dev.
 *
 * Implements `@molecule/api-emails-inbound`'s `InboundEmailProvider`
 * interface against AWS SES Inbound's SNS-delivery format. Validates SNS
 * notification signatures by fetching the publisher cert from a
 * `*.amazonaws.com`-allowlisted URL, parses the SES `mail` + `content`
 * fields, and decodes the embedded RFC 822 message via `mailparser`.
 *
 * Outbound replies compose onto the bonded `@molecule/api-emails`
 * transport (typically `@molecule/api-emails-ses`) — this package does not
 * reimplement SMTP / SES SendEmail.
 *
 * @remarks
 * - **Replies need an OUTBOUND transport bonded** (`setTransport(...)` from
 *   `@molecule/api-emails`, typically `@molecule/api-emails-ses`); this package does not send
 *   mail itself. The reply `from` must be an SES-verified identity (defaults to the original
 *   message's first `To:` address when omitted).
 * - **SNS delivers `Content-Type: text/plain`.** `express.json()` / `express.raw({ type:
 *   'application/json' })` skip it and `req.body` is empty — use `express.raw({ type: () => true })`
 *   on this route and pass the raw bytes through.
 * - **The first POST is a `SubscriptionConfirmation`, not mail.** `parseWebhookPayload()`
 *   returns it as a synthetic email with `subject === '__sns:SubscriptionConfirmation'` and the
 *   URL in `headers['x-sns-subscribe-url']`; GET that URL once or SNS never delivers mail.
 * - **Bodies come only from the notification's `content`** (the SES receipt rule's SNS
 *   action). A notification without `content` (e.g. an S3-action notification) yields a
 *   headers-only email — no bodies, no attachments; this bond never reads from S3.
 *
 * Verification is FAIL-CLOSED on publisher identity. An SNS signature only
 * proves that *some* AWS account published the message — the
 * `*.amazonaws.com` cert-hostname allowlist admits every AWS account's
 * signing cert — so a notification is accepted only when it is pinned to
 * YOUR infrastructure: either `AWS_SES_INBOUND_TOPIC_ARN` is set and
 * exactly matches the payload's `TopicArn`, or
 * `AWS_SES_INBOUND_ACCOUNT_ID` is set and matches the publisher's 12-digit
 * AWS account id (read from the `SigningCertURL` path or the account field
 * of the SNS-signed `TopicArn`). When NEITHER is configured,
 * `verifySignature` throws a tagged `config.notConfigured` (503) error
 * instead of accepting any validly-signed SNS message — without a pin, any
 * AWS account could forge inbound mail into your app. Configure at least
 * one of the two in `api/.env`; the topic ARN is the tighter pin.
 *
 * The (uncached) signing-certificate fetch is bounded to a 5 second
 * timeout — a hanging/slow `SigningCertURL` endpoint fails fast into a
 * `false` verification result instead of stalling the webhook handler for
 * `fetch`'s much longer default. Once a cert is fetched it is cached
 * in-process, so this only affects the first verification against a given
 * `SigningCertURL`.
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
 * import { provider as sesInbound } from '@molecule/api-emails-inbound-ses'
 * import { provider as sesTransport } from '@molecule/api-emails-ses'
 *
 * // Startup: bond both. Env: AWS_SES_INBOUND_TOPIC_ARN (the origin pin — REQUIRED, or
 * // AWS_SES_INBOUND_ACCOUNT_ID), plus AWS_SES_REGION + AWS credentials for replies.
 * setProvider(sesInbound)
 * setTransport(sesTransport) // replyTo() sends through the OUTBOUND emails bond
 *
 * const app = express()
 *
 * // PUBLIC route subscribed to the SNS topic your SES receipt rule publishes to. SNS posts
 * // JSON as `text/plain`, so take the RAW body for ANY content type.
 * app.post('/webhooks/ses-inbound', express.raw({ type: () => true }), async (req, res) => {
 *   if (!(await verifySignature(req.headers, req.body))) {
 *     res.status(401).end()
 *     return
 *   }
 *   const email = await parseWebhookPayload(req.headers, req.body)
 *
 *   // First delivery after subscribing: confirm the subscription, no mail yet.
 *   if (email.subject === '__sns:SubscriptionConfirmation') {
 *     const subscribeUrl = email.headers['x-sns-subscribe-url']
 *     if (typeof subscribeUrl === 'string') await fetch(subscribeUrl)
 *     res.status(200).end()
 *     return
 *   }
 *
 *   console.log(email.id, email.from, email.subject, email.textBody)
 *   await replyTo(email, {
 *     from: 'support@desk.example.com', // a verified SES identity
 *     textBody: `Thanks, we received "${email.subject}".`,
 *   })
 *   res.status(200).end()
 * })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './utilities.js'
