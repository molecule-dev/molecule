/**
 * Google Wallet JWT signer.
 *
 * Google's "save to wallet" flow uses an RS256-signed JWT containing the
 * pass class + object payloads. The user clicks a redirect URL of the form
 *
 *     https://pay.google.com/gp/v/save/<jwt>
 *
 * and Google validates the JWT against the issuer's service account. We
 * sign with `node:crypto` to avoid pulling in a JWT dependency.
 *
 * @see https://developers.google.com/wallet/tickets/events/web/save-to-wallet
 *
 * @module
 */

import { createSign } from 'node:crypto'

import type {
  GoogleWalletClass,
  GoogleWalletObject,
  GoogleWalletPassType,
  GoogleWalletServiceAccount,
} from './types.js'

/**
 * Default audience Google Wallet expects in `aud`.
 */
const DEFAULT_AUDIENCE = 'google'

/**
 * Default JWT type Google Wallet expects in `typ`.
 */
const DEFAULT_TYPE = 'savetowallet'

/**
 * Default origins Google Wallet expects in the payload.
 */
const DEFAULT_ORIGINS = ['https://wallet.google'] as const

/**
 * Default pass type when a caller does not specify one — preserves the
 * historical event-ticket behavior.
 */
const DEFAULT_PASS_TYPE: GoogleWalletPassType = 'eventTicket'

/**
 * Maps each {@link GoogleWalletPassType} to the pair of JWT `payload` keys
 * Google Wallet expects for that pass. This is how a coupon (an `'offer'`)
 * is routed to `offerClasses`/`offerObjects` instead of the event-ticket keys.
 * `'coupon'` is an alias for `'offer'` — Google Wallet has no separate coupon
 * type.
 */
const PASS_TYPE_PAYLOAD_KEYS: Record<
  GoogleWalletPassType,
  { classKey: string; objectKey: string }
> = {
  eventTicket: { classKey: 'eventTicketClasses', objectKey: 'eventTicketObjects' },
  offer: { classKey: 'offerClasses', objectKey: 'offerObjects' },
  coupon: { classKey: 'offerClasses', objectKey: 'offerObjects' },
  loyalty: { classKey: 'loyaltyClasses', objectKey: 'loyaltyObjects' },
  giftCard: { classKey: 'giftCardClasses', objectKey: 'giftCardObjects' },
  flight: { classKey: 'flightClasses', objectKey: 'flightObjects' },
  transit: { classKey: 'transitClasses', objectKey: 'transitObjects' },
  generic: { classKey: 'genericClasses', objectKey: 'genericObjects' },
}

/**
 * Build and RS256-sign a Google Wallet JWT containing the pass class and
 * pass object. The returned string can be embedded directly into the
 * `https://pay.google.com/gp/v/save/<jwt>` redirect URL.
 *
 * The `passType` selects which Google Wallet class/object keys the payload
 * carries, so the SAME function creates event tickets, offers/coupons, loyalty
 * cards, gift cards, boarding passes, transit passes, or generic passes —
 * routed via {@link PASS_TYPE_PAYLOAD_KEYS}. It is NOT hardcoded to event
 * tickets.
 *
 * @param passClass - Pass class definition (template).
 * @param passObject - Pass object definition (per-user instance).
 * @param serviceAccount - Service-account email + RSA private key.
 * @param origins - Optional origin domains; defaults to `['https://wallet.google']`.
 * @param passType - Google Wallet pass type; defaults to `'eventTicket'`. Use
 *   `'offer'` (or `'coupon'`) to issue a coupon. See {@link GoogleWalletPassType}.
 * @returns A signed JWT string.
 *
 * @example
 * ```ts
 * import { createGoogleWalletJwt } from '@molecule/api-wallet-pass'
 *
 * // Event ticket (default pass type).
 * const jwt = createGoogleWalletJwt(
 *   { id: '3388000000022123456.event-class-id' },
 *   {
 *     id: '3388000000022123456.event-object-id',
 *     classId: '3388000000022123456.event-class-id',
 *     state: 'ACTIVE',
 *   },
 *   {
 *     clientEmail: 'wallet-issuer@my-project.iam.gserviceaccount.com',
 *     privateKey: process.env.GOOGLE_WALLET_PRIVATE_KEY!,
 *   },
 * )
 *
 * // Coupon (Google Wallet "offer" pass type).
 * const couponJwt = createGoogleWalletJwt(
 *   { id: '3388000000022123456.coupon-class-id' },
 *   {
 *     id: '3388000000022123456.coupon-object-id',
 *     classId: '3388000000022123456.coupon-class-id',
 *     state: 'ACTIVE',
 *   },
 *   { clientEmail: 'wallet-issuer@my-project.iam.gserviceaccount.com', privateKey: pem },
 *   undefined,
 *   'coupon',
 * )
 *
 * const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`
 * ```
 */
export function createGoogleWalletJwt(
  passClass: GoogleWalletClass,
  passObject: GoogleWalletObject,
  serviceAccount: GoogleWalletServiceAccount,
  origins: readonly string[] = DEFAULT_ORIGINS,
  passType: GoogleWalletPassType = DEFAULT_PASS_TYPE,
): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const issuedAt = Math.floor(Date.now() / 1000)
  const { classKey, objectKey } = PASS_TYPE_PAYLOAD_KEYS[passType]
  const payload = {
    iss: serviceAccount.clientEmail,
    aud: DEFAULT_AUDIENCE,
    typ: DEFAULT_TYPE,
    iat: issuedAt,
    origins: [...origins],
    payload: {
      [classKey]: [passClass],
      [objectKey]: [passObject],
    },
  }

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`

  let signatureB64: string
  try {
    const signer = createSign('RSA-SHA256')
    signer.update(signingInput)
    signer.end()
    signatureB64 = base64UrlEncode(signer.sign(serviceAccount.privateKey))
  } catch (error) {
    // Never let the private key leak into the error path — wrap without re-exposing it.
    throw new Error('Failed to sign Google Wallet JWT — invalid service-account private key.', {
      cause: error,
    })
  }

  return `${signingInput}.${signatureB64}`
}

/**
 * Base64-url-encode the JSON form of a value (RFC 7515 §2 — the "JOSE"
 * encoding).
 *
 * @param value - JSON-serializable value.
 * @returns Base64-url string with no padding.
 */
function base64UrlJson(value: unknown): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(value), 'utf8'))
}

/**
 * Base64-url-encode raw bytes (no `=` padding, `+`/`/` swapped for `-`/`_`).
 *
 * @param buf - Bytes to encode.
 * @returns Base64-url string.
 */
function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
