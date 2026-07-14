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
 * import { setProvider } from '@molecule/api-emails-inbound'
 * import { provider as mailgunRoutes } from '@molecule/api-emails-inbound-mailgun'
 *
 * setProvider(mailgunRoutes)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
