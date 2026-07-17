/**
 * SendGrid email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/@sendgrid/mail
 *
 * @remarks
 * - **Configuration is lazy and env-driven**: `SENDGRID_API_KEY` (and the
 *   optional `SENDGRID_BASE_URL`) are read on the FIRST send via
 *   `getClient()` — NOT at import time — and applied once. So a key resolved
 *   into `process.env` AFTER this module is imported (late secrets resolution
 *   via a secrets bond) is honored: the value present at send time is the one
 *   used. If the key is genuinely absent at send time, `sendMail()` throws a
 *   tagged config-missing error (clean 503 / `config.notConfigured`) naming
 *   `SENDGRID_API_KEY` — never an opaque SendGrid 401.
 * - `SENDGRID_TEST_MODE=true` enables SendGrid sandbox mode: the API
 *   validates and accepts the message (auth + payload exercised for real) but
 *   NOTHING is delivered. `SENDGRID_BASE_URL` (optional, read lazily on first
 *   send too) overrides the API base URL for brokers/compatible endpoints.
 * - Stream attachments are not supported — Buffer/string content only; a
 *   stream throws. On success `accepted` echoes every `to` recipient
 *   (SendGrid returns no per-recipient verdict) and `messageId` is taken from
 *   the `x-message-id` response header.
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-emails-sendgrid'
 *
 * setTransport(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './sendMail.js'
export * from './transport.js'
export * from './types.js'
