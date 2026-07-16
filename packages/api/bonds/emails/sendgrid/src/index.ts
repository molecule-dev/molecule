/**
 * SendGrid email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/@sendgrid/mail
 *
 * @remarks
 * - **`SENDGRID_API_KEY` is consumed at module load** (`setApiKey()` runs at
 *   import time). If the key lands in `process.env` AFTER this module is
 *   imported (late secrets resolution), the call-time "key present" guard
 *   passes but requests go out unauthenticated — an opaque SendGrid 401
 *   ("The provided authorization grant is invalid"). Ensure the key is in the
 *   environment before the bond is imported (e.g. dotenv preload).
 * - `SENDGRID_TEST_MODE=true` enables SendGrid sandbox mode: the API
 *   validates and accepts the message (auth + payload exercised for real) but
 *   NOTHING is delivered. `SENDGRID_BASE_URL` (optional, also read at module
 *   load) overrides the API base URL for brokers/compatible endpoints.
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
