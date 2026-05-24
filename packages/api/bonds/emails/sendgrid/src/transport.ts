/**
 * SendGrid mail client configuration.
 *
 * @module
 */

import sgMail from '@sendgrid/mail'

/**
 * The subset of the underlying `@sendgrid/client` instance this module uses.
 *
 * `@sendgrid/mail`'s published `MailService` type does not expose the `client`
 * accessor (only `setClient`), even though it exists at runtime. This narrow
 * local interface types just the one method used here — `setDefaultRequest`,
 * which merges defaults (such as `baseUrl`) into every outgoing request — so we
 * avoid an ambient module-widening declaration.
 */
interface SendGridClient {
  /** Sets a default value (e.g. `baseUrl`) applied to every request. */
  setDefaultRequest(key: 'baseUrl', value: string): unknown
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

// Optional base URL override for proxying through a credential broker or a
// self-hosted / SendGrid-compatible endpoint. `@sendgrid/mail` delegates HTTP
// to an underlying client (`sgMail.client`) whose `setDefaultRequest(key, value)`
// merges defaults into every outgoing request. When `SENDGRID_BASE_URL` is unset
// the client keeps its built-in default base URL, so behaviour is unchanged.
if (process.env.SENDGRID_BASE_URL) {
  const client = (sgMail as unknown as { client: SendGridClient }).client
  client.setDefaultRequest('baseUrl', process.env.SENDGRID_BASE_URL)
}

/**
 * The configured SendGrid mail client.
 *
 * @see https://www.npmjs.com/package/@sendgrid/mail
 */
export const sgClient = sgMail
