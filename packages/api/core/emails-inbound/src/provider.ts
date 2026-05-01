/**
 * Inbound-emails provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-emails-inbound-mailgun-routes`,
 * `@molecule/api-emails-inbound-ses`) call `setProvider()` during
 * application startup. Application code uses the convenience functions
 * (`parseWebhookPayload`, `verifySignature`, `replyTo`, `supportsReply`)
 * which delegate to the bonded provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  InboundEmail,
  InboundEmailProvider,
  InboundEmailReply,
  InboundEmailReplyResult,
} from './types.js'

const BOND_TYPE = 'emails-inbound'
expectBond(BOND_TYPE)

/**
 * Registers an inbound-emails provider as the active singleton. Called by
 * bond packages (e.g. `@molecule/api-emails-inbound-mailgun-routes`)
 * during application startup.
 *
 * @param provider - The inbound-emails provider implementation to bond.
 */
export const setProvider = (provider: InboundEmailProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded inbound-emails provider, throwing if none is
 * configured.
 *
 * @returns The bonded inbound-emails provider.
 * @throws {Error} If no inbound-emails provider has been bonded.
 */
export const getProvider = (): InboundEmailProvider => {
  try {
    return bondRequire<InboundEmailProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('emailsInbound.error.noProvider', undefined, {
        defaultValue: 'Inbound-emails provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an inbound-emails provider is currently bonded.
 *
 * @returns `true` if an inbound-emails provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Parses the raw webhook payload (HTTP headers + body) into a normalized
 * {@link InboundEmail} using the bonded provider.
 *
 * @param headers - HTTP request headers received by the webhook endpoint.
 * @param body - Raw HTTP request body.
 * @returns The normalized inbound email.
 * @throws {Error} If no inbound-emails provider has been bonded.
 */
export const parseWebhookPayload = async (
  headers: Record<string, string | string[] | undefined>,
  body: Buffer | string | Record<string, unknown>,
): Promise<InboundEmail> => {
  return getProvider().parseWebhookPayload(headers, body)
}

/**
 * Verifies the signature of a webhook request via the bonded provider.
 *
 * @param headers - HTTP request headers received by the webhook endpoint.
 * @param body - Raw HTTP request body.
 * @returns `true` when the signature is valid, `false` otherwise.
 * @throws {Error} If no inbound-emails provider has been bonded.
 */
export const verifySignature = async (
  headers: Record<string, string | string[] | undefined>,
  body: Buffer | string,
): Promise<boolean> => {
  return getProvider().verifySignature(headers, body)
}

/**
 * Indicates whether the bonded provider supports outbound reply dispatch
 * via {@link replyTo}.
 *
 * @returns `true` when the bonded provider exposes a `replyTo()` method
 *   and reports `supportsReply() === true`.
 * @throws {Error} If no inbound-emails provider has been bonded.
 */
export const supportsReply = (): boolean => {
  const provider = getProvider()
  return typeof provider.replyTo === 'function' && provider.supportsReply()
}

/**
 * Dispatches an outbound reply through the bonded provider's reply
 * mechanism.
 *
 * @param email - The original inbound email being replied to.
 * @param reply - The reply payload.
 * @returns Result of the dispatch.
 * @throws {Error} If no inbound-emails provider has been bonded, or if
 *   the bonded provider does not support reply dispatch.
 */
export const replyTo = async (
  email: InboundEmail,
  reply: InboundEmailReply,
): Promise<InboundEmailReplyResult> => {
  const provider = getProvider()

  if (typeof provider.replyTo !== 'function' || !provider.supportsReply()) {
    throw new Error(
      t('emailsInbound.error.replyNotSupported', undefined, {
        defaultValue:
          'Bonded inbound-emails provider does not support reply dispatch. ' +
          'Use the outbound @molecule/api-emails bond instead.',
      }),
    )
  }

  return provider.replyTo(email, reply)
}
