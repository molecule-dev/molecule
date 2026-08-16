/**
 * AWS SES email provider implementation.
 *
 * @see https://www.npmjs.com/package/nodemailer
 * @see https://aws.amazon.com/ses/
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import nodemailer from 'nodemailer'

import { getLogger } from '@molecule/api-bond'
import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'
import { getProxyAgents } from '@molecule/api-proxy-agent'

const logger = getLogger()

/**
 * The lazily-constructed AWS SESv2 client and nodemailer transport. Both are
 * built on first send — NOT at import — and memoized thereafter.
 */
let _ses: SESv2Client | undefined
let _nodemailerTransport: nodemailer.Transporter | undefined

/**
 * Returns the AWS SESv2 client, constructing it from the environment on the
 * FIRST call and memoizing thereafter.
 *
 * Construction is deferred to first use — NOT module load — so a region resolved
 * into `process.env` AFTER this module is imported (late secrets resolution via
 * a secrets bond) is honored: `AWS_SES_REGION` (default `us-east-1`) and the
 * optional `AWS_SES_ENDPOINT` are read at send time, not frozen at import.
 * Reading them at import instead pinned an empty/default region and every send
 * failed in the WRONG region ("Email address is not verified"). Credentials
 * still resolve lazily via the AWS default chain (`AWS_ACCESS_KEY_ID`/
 * `AWS_SECRET_ACCESS_KEY`, shared config, or an instance role) at send time, so
 * a missing credential surfaces then as a descriptive AWS SDK error.
 *
 * nodemailer 7 requires the SESv2 client + `SendEmailCommand` pair — the old
 * `{ ses, aws }` (@aws-sdk/client-ses) shape made `createTransport` THROW
 * ("legacy SES configuration"), breaking every real consumer of this bond.
 *
 * @returns The configured SESv2 client.
 */
export const getSesClient = (): SESv2Client => {
  if (!_ses) {
    const region = process.env.AWS_SES_REGION || 'us-east-1'
    const endpoint = process.env.AWS_SES_ENDPOINT
    // The AWS SDK v3 builds its own `https.Agent` and reads no proxy variable
    // (`NODE_USE_ENV_PROXY` does not reach it either — it never goes through
    // Node's proxy-aware paths), so on a host whose only egress path is a proxy
    // every send failed with a bare connection error. `requestHandler` takes
    // NodeHttpHandler OPTIONS, so the agent goes in with no `@smithy/*`
    // dependency. Resolved against the endpoint actually in use so a custom
    // endpoint's own NO_PROXY entry is honoured; undefined when nothing is
    // proxied, leaving the SDK's default handler in place.
    const proxy = getProxyAgents(endpoint || `https://email.${region}.amazonaws.com`)
    _ses = new SESv2Client({
      region,
      credentialDefaultProvider: defaultProvider,
      ...(endpoint ? { endpoint } : {}),
      ...(proxy ? { requestHandler: proxy } : {}),
    })
  }
  return _ses
}

/**
 * Returns the lazily-initialized nodemailer transport (nodemailer 7 SESv2
 * shape), constructing it — and the underlying SESv2 client — from the
 * environment on the first send and memoizing thereafter.
 *
 * @returns The nodemailer `Transporter` backed by AWS SES.
 */
const getTransport = (): nodemailer.Transporter => {
  if (!_nodemailerTransport) {
    _nodemailerTransport = nodemailer.createTransport({
      SES: { sesClient: getSesClient(), SendEmailCommand },
    } as Parameters<typeof nodemailer.createTransport>[0])
  }
  return _nodemailerTransport
}

/**
 * Sends an email through AWS SES via nodemailer. The SES client and transport
 * are configured lazily from the environment on the first call, so late-resolved
 * region/credentials are honored.
 *
 * @param message - The email message (to, from, subject, text/html, attachments).
 * @returns Send result with accepted/rejected addresses and message ID.
 */
export const sendMail = async (message: EmailMessage): Promise<EmailSendResult> => {
  try {
    const result = await getTransport().sendMail(message as nodemailer.SendMailOptions)

    return {
      // nodemailer's SES transport resolves with `{ envelope, messageId,
      // response, raw }` — it NEVER sets `accepted`/`rejected` (only the SMTP
      // transports do; the @types/nodemailer SentMessageInfo claiming otherwise
      // is type-level drift). A resolved SendEmail call means SES accepted the
      // message for every envelope recipient, so map `envelope.to` to
      // `accepted` — without this, every successful send reported
      // `accepted: []` and callers gating on "was my recipient accepted?"
      // concluded delivery failed.
      accepted: (result.accepted ?? result.envelope?.to ?? []) as string[],
      rejected: (result.rejected ?? []) as string[],
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    logger.error('SES sendMail error:', error)
    throw error
  }
}

/**
 * The SES email provider implementing the `EmailTransport` interface.
 */
export const provider: EmailTransport = {
  sendMail,
}

/**
 * Raw nodemailer transport for direct access. Lazily configured on first send.
 * @deprecated Use `sendMail()` or `provider` instead.
 */
export const transport = {
  sendMail: (msg: nodemailer.SendMailOptions) => getTransport().sendMail(msg),
}

/**
 * Raw nodemailer transport alias.
 * @deprecated Use `sendMail()` or `provider` instead.
 */
export const email = transport
