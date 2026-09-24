/**
 * AWS SES email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://aws.amazon.com/ses/
 *
 * @remarks
 * - **Bond it with the emails core's `setTransport(provider)`** (not `setProvider`, not
 *   `bond('emails-ses', ...)`), then send with the core's `sendMail()`. It uses the SESv2
 *   `SendEmail` API (raw MIME via nodemailer), not SMTP credentials.
 * - **Configuration is lazy and env-driven**: the SES client is constructed on
 *   the FIRST send — NOT at import — so `AWS_SES_REGION` (default `us-east-1`)
 *   and the optional `AWS_SES_ENDPOINT` are read at send time. A region resolved
 *   into env AFTER this module is imported (late secrets resolution via a
 *   secrets bond) is honored; reading it at import instead froze the
 *   default/empty region and sends failed in the WRONG region ("Email address
 *   is not verified"). Credentials resolve lazily via the AWS default chain
 *   (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, shared config, or an instance
 *   role), so they may arrive after import too.
 * - **No fail-fast**: because credentials can legitimately come from an instance
 *   role or shared config (not env), missing credentials are not pre-checked —
 *   they surface at first send as a descriptive AWS SDK error ("Could not load
 *   credentials…"), not a tagged config error naming the env var.
 * - New SES accounts are sandboxed: both the sender identity AND every
 *   recipient must be verified until production access is granted.
 * - On success `accepted` is mapped from `envelope.to` — nodemailer's SES
 *   transport never sets `accepted`/`rejected` (the `@types/nodemailer` typings
 *   claiming otherwise are drift); a resolved send means SES accepted the
 *   message for every envelope recipient.
 * - **Runs behind an outbound proxy when `HTTPS_PROXY` is set.** The AWS SDK v3
 *   builds its own agent and reads no proxy variable, so on a host whose only
 *   egress path is a proxy every send used to fail with a bare connection
 *   error. The client now gets a CONNECT-capable agent through its own
 *   `requestHandler` hook (`@molecule/api-proxy-agent`, resolved against
 *   `AWS_SES_ENDPOINT` when set and the regional endpoint otherwise, so
 *   `NO_PROXY` is honoured). With no proxy configured nothing is passed and the
 *   SDK keeps its default handler. Allowlist `*.amazonaws.com` on the proxy.
 *
 * @example
 * ```typescript
 * import { sendMail, setTransport } from '@molecule/api-emails'
 * import { provider as ses } from '@molecule/api-emails-ses'
 *
 * // Startup: bond once. Env: AWS_SES_REGION (default us-east-1) and AWS credentials
 * // (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or an instance role) — read on first send.
 * setTransport(ses)
 *
 * const result = await sendMail({
 *   from: 'Acme <no-reply@acme.example>', // an SES-VERIFIED identity (domain or address)
 *   to: 'ada@example.com',
 *   subject: 'Welcome to Acme',
 *   text: 'Thanks for signing up!',
 *   html: '<p>Thanks for signing up!</p>',
 * })
 * // { accepted: ['ada@example.com'], rejected: [], messageId: '<SES MessageId@<region>.amazonses.com>' }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
