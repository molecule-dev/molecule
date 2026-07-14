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
 * The (uncached) signing-certificate fetch is bounded to a 5 second
 * timeout — a hanging/slow `SigningCertURL` endpoint fails fast into a
 * `false` verification result instead of stalling the webhook handler for
 * `fetch`'s much longer default. Once a cert is fetched it is cached
 * in-process, so this only affects the first verification against a given
 * `SigningCertURL`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-emails-inbound'
 * import { provider as sesInbound } from '@molecule/api-emails-inbound-ses'
 *
 * setProvider(sesInbound)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './utilities.js'
