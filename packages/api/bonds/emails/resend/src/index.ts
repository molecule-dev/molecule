/**
 * Resend email provider for molecule.dev.
 *
 * @see https://resend.com/docs/api-reference/emails/send-email
 *
 * @remarks
 * - **Zero dependencies — talks to Resend's REST API with the runtime's global
 *   `fetch`** (`POST https://api.resend.com/emails`), so every app that installs
 *   this bond stays dependency-free; the official `resend` SDK can be swapped in
 *   later without changing the bond's interface.
 * - **`from` MUST be on a domain you VERIFIED in Resend** (Resend → Domains, DNS
 *   records added and checked), or the API rejects the send with a 403
 *   `validation_error` ("domain is not verified"). Before any domain is verified
 *   the only usable sender is `onboarding@resend.dev` — testing only, and it can
 *   deliver ONLY to the account owner's own address. Read the sender from config,
 *   never hardcode a placeholder: set `RESEND_FROM` (e.g.
 *   `Acme <no-reply@your-verified-domain.com>`) and it is used whenever a
 *   message's `from` is empty; if both are missing, `sendMail()` throws a tagged
 *   config-missing error naming `RESEND_FROM`.
 * - **Configuration is lazy and env-driven**: `RESEND_API_KEY` (and the optional
 *   `RESEND_BASE_URL` override for brokers / compatible endpoints) are read on
 *   EACH send — never at import time — so a key resolved into `process.env`
 *   after import (late secrets resolution via a secrets bond) is honored. If the
 *   key is absent at send time, `sendMail()` throws a tagged config-missing
 *   error (clean 503 / `config.notConfigured`) naming `RESEND_API_KEY` — never
 *   an opaque Resend 401.
 * - **There is NO sandbox / test-mode flag in the Resend API** (nothing like
 *   SendGrid's `sandboxMode`). Every accepted request is a real send that counts
 *   against the account's quota — including sends to the simulation recipients
 *   `delivered@resend.dev`, `bounced@resend.dev` and `complained@resend.dev`,
 *   which are the supported way to exercise the delivery / bounce / spam paths
 *   without emailing a real inbox.
 * - **Attachments** are sent base64-encoded inline; Resend caps the whole email
 *   at **40 MB after encoding** (larger sends are rejected). Buffer / string
 *   content only — a stream attachment throws. A `cid` becomes Resend's
 *   `content_id` for inline images (`<img src="cid:...">`).
 * - **API errors surface as `ResendApiError`** carrying `status` (HTTP) and
 *   `code` (Resend's error name — `validation_error`, `rate_limit_exceeded`,
 *   `daily_quota_exceeded`, …). They are deliberately NOT tagged with
 *   `statusCode` / `errorKey`, so the API middleware returns its generic 500
 *   instead of echoing Resend's status to the caller. On success `accepted`
 *   echoes every `to` recipient (Resend returns no per-recipient verdict) and
 *   `messageId` is the `id` from the response body.
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-emails-resend'
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
