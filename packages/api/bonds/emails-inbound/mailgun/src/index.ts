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

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
