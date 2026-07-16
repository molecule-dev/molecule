/**
 * AWS SES email provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://aws.amazon.com/ses/
 *
 * @remarks
 * - **The SES client is created at module load**: `AWS_SES_REGION` (default
 *   `us-east-1`) and optional `AWS_SES_ENDPOINT` are frozen at import time —
 *   a region resolved into env later is ignored, which surfaces as
 *   "Email address is not verified" in the WRONG region. Credentials resolve
 *   lazily via the AWS default chain (`AWS_ACCESS_KEY_ID`/
 *   `AWS_SECRET_ACCESS_KEY`, shared config, or an instance role), so they may
 *   arrive after import.
 * - **No fail-fast**: missing credentials surface at first send as a raw AWS
 *   SDK error ("Could not load credentials…"), not a tagged config error
 *   naming the env var.
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
