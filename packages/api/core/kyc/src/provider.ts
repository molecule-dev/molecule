/**
 * KYC provider singleton accessor.
 *
 * Bond packages call {@link setProvider} during application startup. Handlers
 * call {@link getProvider} or one of the convenience wrappers
 * ({@link createVerificationSession}, {@link getVerificationStatus}, ...) at
 * runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  CreateKycSessionOptions,
  KycProvider,
  KycSession,
  KycSessionStatus,
  KycWebhookEvent,
  KycWebhookHeaders,
} from './types.js'

/** Bond category key for the KYC provider. */
const BOND_TYPE = 'kyc'

/**
 * Registers a KYC provider as the active singleton. Called by bond packages
 * (e.g. `@molecule/api-kyc-stripe-identity`) during app startup.
 *
 * @param provider - The KYC provider implementation to bond.
 */
export const setProvider = (provider: KycProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded KYC provider, throwing if none is configured.
 *
 * @returns The bonded KYC provider.
 * @throws {Error} If no KYC provider has been bonded.
 */
export const getProvider = (): KycProvider => {
  try {
    return bondRequire<KycProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('kyc.error.noProvider', undefined, {
        defaultValue: 'KYC provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a KYC provider is currently bonded.
 *
 * @returns `true` if a KYC provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded KYC provider, returning `null` if none is bonded.
 *
 * @returns The bonded KYC provider, or `null`.
 */
export const getOptionalProvider = (): KycProvider | null => {
  return bondGet<KycProvider>(BOND_TYPE) ?? null
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param options - Session parameters (user, type, return URL, metadata).
 * @returns The created session.
 */
export const createVerificationSession = (
  options: CreateKycSessionOptions,
): Promise<KycSession> => {
  return getProvider().createVerificationSession(options)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param sessionId - Provider-specific session id.
 * @returns The normalized session status.
 */
export const getVerificationStatus = (sessionId: string): Promise<KycSessionStatus> => {
  return getProvider().getVerificationStatus(sessionId)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param sessionId - Provider-specific session id.
 * @returns The session status after cancellation.
 */
export const cancelVerificationSession = (sessionId: string): Promise<KycSessionStatus> => {
  return getProvider().cancelVerificationSession(sessionId)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param headers - Inbound request headers (verbatim).
 * @param body - Raw request body bytes.
 * @returns The normalized webhook event.
 */
export const processWebhook = (
  headers: KycWebhookHeaders,
  body: string | Buffer,
): Promise<KycWebhookEvent> => {
  return getProvider().processWebhook(headers, body)
}
