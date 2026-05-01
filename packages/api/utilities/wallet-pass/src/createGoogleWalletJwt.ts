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
 * Build and RS256-sign a Google Wallet JWT containing the pass class and
 * pass object. The returned string can be embedded directly into the
 * `https://pay.google.com/gp/v/save/<jwt>` redirect URL.
 *
 * @param passClass - Pass class definition (template).
 * @param passObject - Pass object definition (per-user instance).
 * @param serviceAccount - Service-account email + RSA private key.
 * @param origins - Optional origin domains; defaults to `['https://wallet.google']`.
 * @returns A signed JWT string.
 *
 * @example
 * ```ts
 * import { createGoogleWalletJwt } from '@molecule/api-wallet-pass'
 *
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
 * const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`
 * ```
 */
export function createGoogleWalletJwt(
  passClass: GoogleWalletClass,
  passObject: GoogleWalletObject,
  serviceAccount: GoogleWalletServiceAccount,
  origins: readonly string[] = DEFAULT_ORIGINS,
): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.clientEmail,
    aud: DEFAULT_AUDIENCE,
    typ: DEFAULT_TYPE,
    iat: issuedAt,
    origins: [...origins],
    payload: {
      eventTicketClasses: [passClass],
      eventTicketObjects: [passObject],
    },
  }

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`

  let signatureB64: string
  try {
    const signer = createSign('RSA-SHA256')
    signer.update(signingInput)
    signer.end()
    signatureB64 = base64UrlEncode(signer.sign(serviceAccount.privateKey))
  } catch {
    // Never let the private key leak into the error path.
    throw new Error('Failed to sign Google Wallet JWT — invalid service-account private key.')
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
