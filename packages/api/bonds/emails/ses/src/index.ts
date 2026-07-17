/**
 * AWS SES email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://aws.amazon.com/ses/
 *
 * @remarks
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
 *   transport never sets `accepted`/`rejected` (the @types/nodemailer typings
 *   claiming otherwise are drift); a resolved send means SES accepted the
 *   message for every envelope recipient.
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-emails-ses'
 *
 * setTransport(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
