/**
 * SendGrid mail client configuration.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when transport.js is imported directly
// (not through the package barrel).
import './secrets.js'
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

/**
 * Whether the API key / base URL have already been applied to the shared
 * `@sendgrid/mail` singleton, so each is configured exactly once (on the first
 * send that sees it present) rather than on every send.
 */
let apiKeyConfigured = false
let baseUrlConfigured = false

/**
 * Returns the SendGrid mail client, applying configuration from the environment
 * on FIRST USE and memoizing each setting thereafter.
 *
 * Configuration is deferred to the first send — NOT module load — so an app that
 * resolves `SENDGRID_API_KEY` (and the optional `SENDGRID_BASE_URL`) into
 * `process.env` AFTER this module is imported (late secrets resolution via a
 * secrets bond) is honored: the value present at send time is the one applied.
 * Reading the key at import time instead froze an empty/stale key and every
 * request went out unauthenticated — an opaque SendGrid 401. Each env var is
 * applied once, the first time it is seen set, so whichever arrives late is
 * still picked up.
 *
 * @returns The configured `@sendgrid/mail` client.
 */
export const getClient = (): typeof sgMail => {
  const apiKey = process.env.SENDGRID_API_KEY
  if (apiKey && !apiKeyConfigured) {
    sgMail.setApiKey(apiKey)
    apiKeyConfigured = true
  }

  // Optional base URL override for proxying through a credential broker or a
  // self-hosted / SendGrid-compatible endpoint. `@sendgrid/mail` delegates HTTP
  // to an underlying client (`sgMail.client`) whose `setDefaultRequest(key, value)`
  // merges defaults into every outgoing request. When `SENDGRID_BASE_URL` is unset
  // the client keeps its built-in default base URL, so behaviour is unchanged.
  const baseUrl = process.env.SENDGRID_BASE_URL
  if (baseUrl && !baseUrlConfigured) {
    const client = (sgMail as unknown as { client: SendGridClient }).client
    client.setDefaultRequest('baseUrl', baseUrl)
    baseUrlConfigured = true
  }

  return sgMail
}
