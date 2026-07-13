/**
 * Apple App Store Server Notifications V2 (`signedPayload` JWS) parsing.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { ParsedNotification } from '@molecule/api-payments'

const logger = getLogger()

import { APPLE_ROOT_CA_G3_DER } from './appleRootCertificate.js'
import { decodeAndVerifyJWS } from './jws.js'

/**
 * Maps a v2 `notificationType` to the SAME simplified event vocabulary the
 * legacy v1 path uses (`renewed`/`canceled`/`expired`/`refund`), so
 * `handlePaymentNotification` (in `@molecule/api-resource-user`) doesn't need
 * to know which Apple notification version produced the event. Types with no
 * entitlement effect (metadata/informational) fall through to the raw
 * lower-cased type, matching the v1 map's own fallback for unrecognized types.
 *
 * @see https://developer.apple.com/documentation/appstoreservernotifications/notificationtype
 */
const V2_TYPE_MAP: Record<string, string> = {
  SUBSCRIBED: 'renewed',
  DID_RENEW: 'renewed',
  DID_CHANGE_RENEWAL_STATUS: 'renewed',
  DID_CHANGE_RENEWAL_PREF: 'renewed',
  OFFER_REDEEMED: 'renewed',
  PRICE_INCREASE: 'renewed',
  RENEWAL_EXTENDED: 'renewed',
  REFUND_REVERSED: 'renewed',
  DID_FAIL_TO_RENEW: 'expired',
  EXPIRED: 'expired',
  GRACE_PERIOD_EXPIRED: 'expired',
  REFUND: 'refund',
  CONSUMPTION_REQUEST: 'refund',
  REVOKE: 'canceled',
}

/** Shape of the decoded outer `signedPayload` JWS payload. */
interface DecodedNotificationPayload {
  notificationType?: string
  subtype?: string
  data?: {
    signedTransactionInfo?: string
    signedRenewalInfo?: string
  }
}

/** Shape of the decoded `signedTransactionInfo` nested JWS payload (the fields this bond uses). */
interface DecodedTransactionInfo {
  transactionId?: string
  originalTransactionId?: string
  productId?: string
  expiresDate?: number
}

/** Shape of the decoded `signedRenewalInfo` nested JWS payload (the fields this bond uses). */
interface DecodedRenewalInfo {
  autoRenewStatus?: number
}

/**
 * Parses and authenticates an Apple App Store Server Notifications V2
 * `signedPayload`.
 *
 * @remarks
 * Unlike the legacy v1 path (which re-submits an embedded receipt to Apple's
 * `verifyReceipt` to authenticate a notification), v2's authenticity comes
 * ENTIRELY from the JWS signature: the outer payload, `signedTransactionInfo`,
 * and `signedRenewalInfo` are each independently signed with a certificate
 * chain (`x5c`) rooted at Apple's published Root CA - G3.
 * `decodeAndVerifyJWS` (see `jws.ts`) cryptographically verifies that chain
 * against the hardcoded `APPLE_ROOT_CA_G3_DER` before ANY field is trusted —
 * a forged `signedPayload` cannot produce a chain that terminates at Apple's
 * real root, so verification failure (for any reason: bad signature, wrong
 * algorithm, untrusted/expired certificate) is treated as unauthenticated and
 * rejected (`null`), matching the fail-closed contract of the v1 path. No
 * live call back to Apple is made — this is Apple's own documented model for
 * v2 (the signature chain IS the proof), not a shortcut.
 *
 * @param signedPayload - The raw `signedPayload` JWS string from the notification body.
 * @returns The parsed notification, or `null` if it cannot be authenticated or carries no actionable entitlement change (e.g. a `TEST` notification).
 */
export const parseV2Notification = (signedPayload: string): ParsedNotification | null => {
  let payload: DecodedNotificationPayload
  try {
    payload = decodeAndVerifyJWS(signedPayload, APPLE_ROOT_CA_G3_DER) as DecodedNotificationPayload
  } catch (error) {
    logger.warn('Apple parseNotification (v2): signedPayload failed authentication — rejecting', {
      error,
    })
    return null
  }

  const notificationType = payload.notificationType

  if (!notificationType) {
    logger.warn('Apple parseNotification (v2): decoded payload missing notificationType')
    return null
  }

  // The dashboard "Send Test Notification" button — no entitlement change and
  // no transaction info to parse. Mirrors the Google bond's testNotification
  // handling: log at info, not error, so a working notification-URL wiring
  // check doesn't read as broken.
  if (notificationType === 'TEST') {
    logger.info('Apple parseNotification (v2): received TEST notification — wiring is working.')
    return null
  }

  const signedTransactionInfo = payload.data?.signedTransactionInfo
  if (!signedTransactionInfo) {
    logger.warn(
      `Apple parseNotification (v2): ${notificationType} notification missing signedTransactionInfo — rejecting`,
    )
    return null
  }

  let transactionInfo: DecodedTransactionInfo
  try {
    transactionInfo = decodeAndVerifyJWS(
      signedTransactionInfo,
      APPLE_ROOT_CA_G3_DER,
    ) as DecodedTransactionInfo
  } catch (error) {
    logger.warn(
      'Apple parseNotification (v2): signedTransactionInfo failed authentication — rejecting',
      { error },
    )
    return null
  }

  let autoRenews: boolean | undefined
  if (payload.data?.signedRenewalInfo) {
    try {
      const renewalInfo = decodeAndVerifyJWS(
        payload.data.signedRenewalInfo,
        APPLE_ROOT_CA_G3_DER,
      ) as DecodedRenewalInfo
      autoRenews = renewalInfo.autoRenewStatus === 1
    } catch (error) {
      // Renewal info is supplementary (auto-renew flag only) — a failure here
      // doesn't invalidate the already-authenticated transaction, so degrade
      // (autoRenews stays undefined) rather than reject the whole notification.
      logger.warn(
        'Apple parseNotification (v2): signedRenewalInfo failed authentication — ignoring',
        { error },
      )
    }
  }

  const type = V2_TYPE_MAP[notificationType] ?? notificationType.toLowerCase()

  return {
    transactionId: transactionInfo.originalTransactionId ?? transactionInfo.transactionId,
    productId: transactionInfo.productId,
    type,
    expiresAt: transactionInfo.expiresDate
      ? new Date(transactionInfo.expiresDate).toISOString()
      : undefined,
    autoRenews,
  }
}
