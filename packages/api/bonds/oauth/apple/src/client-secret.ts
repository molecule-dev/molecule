/**
 * Builds the ES256-signed client-secret JWT that Apple requires in place of
 * a static `client_secret` value when calling `/auth/token`.
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 *
 * @module
 */

import jwt from 'jsonwebtoken'

/** Maximum lifetime Apple permits for a client-secret JWT (6 months in seconds). */
export const APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS = 15777000

/** Default client-secret JWT lifetime in seconds (5 minutes). */
export const APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS = 300

/**
 * Inputs required to mint an Apple client-secret JWT.
 */
export interface AppleClientSecretInput {
  /** The Apple Developer Team ID (`iss` claim). */
  teamId: string
  /** The Apple Services ID / client ID (`sub` claim). */
  clientId: string
  /** The 10-character Apple Key ID (`kid` JWT header). */
  keyId: string
  /** PKCS8 PEM-encoded private key contents (the `.p8` file). */
  privateKey: string
  /** Optional override for token lifetime, in seconds. */
  lifetimeSeconds?: number
}

const sanitizePrivateKey = (privateKey: string): string =>
  // Tolerate keys passed via single-line env vars where newlines are encoded as `\n`.
  privateKey.includes(`\\n`) ? privateKey.replace(/\\n/g, `\n`) : privateKey

/**
 * Signs an Apple client-secret JWT (ES256) suitable for use as the
 * `client_secret` parameter in `/auth/token` requests.
 *
 * Note: this function intentionally does not include the private key in
 * any thrown error.
 *
 * @param input - Team ID, client ID, key ID, and private key.
 * @returns The compact-serialized JWT.
 */
export const createAppleClientSecret = ({
  teamId,
  clientId,
  keyId,
  privateKey,
  lifetimeSeconds = APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS,
}: AppleClientSecretInput): string => {
  if (!teamId || !clientId || !keyId || !privateKey) {
    throw new Error(`Apple client secret requires teamId, clientId, keyId, and privateKey.`)
  }

  if (lifetimeSeconds <= 0 || lifetimeSeconds > APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS) {
    throw new Error(
      `Apple client secret lifetimeSeconds must be > 0 and <= ${APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS}.`,
    )
  }

  const issuedAt = Math.floor(Date.now() / 1000)

  try {
    return jwt.sign(
      {
        iss: teamId,
        iat: issuedAt,
        exp: issuedAt + lifetimeSeconds,
        aud: `https://appleid.apple.com`,
        sub: clientId,
      },
      sanitizePrivateKey(privateKey),
      {
        algorithm: `ES256`,
        keyid: keyId,
      },
    )
  } catch {
    // Re-throw with a sanitized message so the private key never appears in logs.
    throw new Error(`Failed to sign Apple client-secret JWT.`)
  }
}
