/**
 * Minimal JWS (RFC 7515) compact-serialization verifier for ES256-signed
 * payloads carrying an `x5c` (RFC 7517 §4.7) certificate chain — the scheme
 * Apple uses for App Store Server Notifications V2 (and the App Store Server
 * API's `signedTransactionInfo` / `signedRenewalInfo`).
 *
 * @remarks
 * Uses ONLY Node's built-in `node:crypto` (no new dependency): `X509Certificate`
 * for the certificate-chain signature checks and `crypto.verify` (with
 * `dsaEncoding: 'ieee-p1363'`, the raw R‖S format JWS ES256 signatures use,
 * as opposed to `crypto.sign`'s DER default) for the JWS payload signature
 * itself.
 *
 * @module
 */

import { verify as cryptoVerify, X509Certificate } from 'node:crypto'

/**
 * Decodes and cryptographically verifies a compact-serialization JWS whose
 * header carries an `x5c` certificate chain, per RFC 7515 + RFC 7517 §4.7.
 *
 * FAILS CLOSED — throws (never silently returns unverified data) when:
 * - the JWS isn't well-formed (not exactly 3 `.`-separated parts, bad base64/JSON)
 * - the header `alg` isn't `ES256` (the only algorithm Apple uses for this
 *   scheme — refusing every other value blocks an "alg confusion" downgrade)
 * - the `x5c` chain is missing or empty
 * - any certificate in the chain is expired or not yet valid
 * - the chain's signatures don't actually chain (`x5c[i]` must verify against
 *   `x5c[i + 1]`'s public key — a signature check, not just a name match)
 * - the chain doesn't terminate at `trustedRootDER` (the last `x5c` entry must
 *   either equal the trusted root byte-for-byte, or be signed by it)
 * - the JWS signature itself doesn't verify against the leaf certificate's
 *   public key
 *
 * A forged payload cannot produce an `x5c` chain that both (a) has internally
 * consistent signatures and (b) terminates at the hardcoded trusted root — an
 * attacker does not hold Apple's root/intermediate private keys, so every
 * check above is load-bearing, not defense-in-depth theater.
 *
 * @param compactJWS - The `header.payload.signature` JWS compact string.
 * @param trustedRootDER - The DER bytes of the CA the chain must terminate at
 *   (e.g. `APPLE_ROOT_CA_G3_DER` from `./appleRootCertificate.js`).
 * @returns The decoded JSON payload — ONLY returned once every check above passes.
 * @throws {Error} With a specific, actionable reason for the FIRST check that fails.
 */
export const decodeAndVerifyJWS = (
  compactJWS: string,
  trustedRootDER: Buffer,
): Record<string, unknown> => {
  const parts = compactJWS.split('.')
  if (parts.length !== 3) {
    throw new Error(`Malformed JWS: expected 3 dot-separated parts, got ${parts.length}.`)
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string]

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
    alg?: string
    x5c?: string[]
  }

  if (header.alg !== 'ES256') {
    throw new Error(`Unsupported JWS alg "${String(header.alg)}" — only ES256 is trusted.`)
  }

  if (!Array.isArray(header.x5c) || header.x5c.length === 0) {
    throw new Error('JWS header is missing an x5c certificate chain.')
  }

  const chain = header.x5c.map((certB64, i) => {
    try {
      return new X509Certificate(Buffer.from(certB64, 'base64'))
    } catch (error) {
      throw new Error(`JWS x5c[${i}] is not a valid X.509 certificate.`, { cause: error })
    }
  })

  const now = new Date()
  chain.forEach((cert, i) => {
    if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) {
      throw new Error(`JWS x5c[${i}] (${cert.subject}) is expired or not yet valid.`)
    }
  })

  // Each certificate (except the last) must be signed by the NEXT one in the
  // chain — leaf issued by intermediate, intermediate issued by (the next
  // intermediate or) the root. `.verify(publicKey)` is an actual cryptographic
  // signature check, not a name-based `checkIssued` match.
  for (let i = 0; i < chain.length - 1; i++) {
    const cert = chain[i]!
    const issuer = chain[i + 1]!
    if (!cert.verify(issuer.publicKey)) {
      throw new Error(`JWS certificate chain is broken between x5c[${i}] and x5c[${i + 1}].`)
    }
  }

  // The chain must terminate at the trusted root — either the last x5c entry
  // IS the trusted root (Apple typically includes it), or it was ISSUED BY
  // the trusted root (tolerates a root omitted from x5c).
  const last = chain[chain.length - 1]!
  const trustedRoot = new X509Certificate(trustedRootDER)
  const lastIsTrustedRoot = last.raw.equals(trustedRoot.raw)
  const lastIssuedByTrustedRoot = !lastIsTrustedRoot && last.verify(trustedRoot.publicKey)
  if (!lastIsTrustedRoot && !lastIssuedByTrustedRoot) {
    throw new Error(
      'JWS certificate chain does not terminate at the trusted root CA — refusing to trust the payload.',
    )
  }

  const leaf = chain[0]!
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`)
  const signature = Buffer.from(signatureB64, 'base64url')
  const verified = cryptoVerify(
    'sha256',
    signingInput,
    { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' },
    signature,
  )
  if (!verified) {
    throw new Error('JWS signature does not verify against the leaf certificate public key.')
  }

  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >
}
