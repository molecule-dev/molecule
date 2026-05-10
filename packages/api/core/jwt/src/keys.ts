/**
 * RSA key pair generation and loading for JWT signing/verification.
 *
 * Keys are loaded from environment variables (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`)
 * or from PEM files on disk at `.keys/{NODE_ENV}/`. If no keys exist, a new
 * RSA-2048 key pair is generated automatically on first import.
 *
 * @module
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()

const __dirname = fileURLToPath(path.dirname(import.meta.url))

const keysPath = path.join(__dirname, `../../.keys/${process.env.NODE_ENV || 'development'}`)
const privateKeyPath = `${keysPath}/jwt_private_key.pem`
const publicKeyPath = `${keysPath}/jwt_public_key.pem`

/**
 * Generates an RSA-2048 key pair in PEM format for JWT signing and verification.
 *
 * @returns An object containing `publicKey` and `privateKey` as PEM strings.
 */
export const generateKeyPairSync = (): { publicKey: string; privateKey: string } =>
  crypto.generateKeyPairSync(`rsa`, {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: `spki`,
      format: `pem`,
    },
    privateKeyEncoding: {
      type: `pkcs8`,
      format: `pem`,
    },
  })

/**
 * Writes a freshly generated RSA key pair to disk as PEM files. Creates
 * the output directory if it does not exist.
 *
 * @param outputPath - Directory to write the PEM files into; defaults to `.keys/{NODE_ENV}/`.
 */
export const writeKeys = (outputPath = keysPath): void => {
  try {
    const { publicKey, privateKey } = generateKeyPairSync()

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true })
    }

    fs.writeFileSync(path.join(outputPath, 'jwt_private_key.pem'), privateKey, `utf8`)
    fs.writeFileSync(path.join(outputPath, 'jwt_public_key.pem'), publicKey, `utf8`)

    logger.info(`JWT key pair successfully written to disk.`)
  } catch (error) {
    logger.error(`Error writing JWT key pair:`, error)
  }
}

// Ensure the keys exist if not provided via environment.
if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    writeKeys()
  }
}

/**
 * Convert PEM read from a process.env value back into a real PEM string.
 *
 * Node's `--env-file` (and many other dotenv readers) deliberately do NOT
 * interpret backslash-escapes inside quoted values, so a `.env` line like
 *   JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END..."
 * arrives in `process.env` as a string containing literal `\n` characters
 * (backslash + n) instead of newlines. Crypto libraries like `jsonwebtoken`
 * then reject the value with "secretOrPrivateKey must be an asymmetric key
 * when using RS256" because the OpenSSL parser can't find PEM headers
 * separated by real newlines.
 *
 * Normalize here so any consumer of this module gets a usable PEM
 * regardless of how the key was stored in the env source.
 */
const normalizePem = (value: string | Buffer | false): string | Buffer | false => {
  if (typeof value !== 'string') return value
  // Only rewrite if the literal escape is present and there are no real
  // newlines yet — preserves keys that arrived correctly (multi-line .env
  // values, files on disk, etc.).
  if (value.includes('\\n') && !value.includes('\n')) {
    return value.replace(/\\n/g, '\n')
  }
  return value
}

/**
 * The RSA private key for signing JWTs. Read from the `JWT_PRIVATE_KEY`
 * environment variable, or loaded from the PEM file on disk.
 *
 * Throws at startup if neither source provides a key — running with an
 * empty secret would allow anyone to forge valid JWTs.
 */
export const JWT_PRIVATE_KEY =
  normalizePem(process.env.JWT_PRIVATE_KEY || false) ||
  (fs.existsSync(privateKeyPath) && fs.readFileSync(privateKeyPath)) ||
  (() => {
    throw new Error(
      'JWT private key not found. Set JWT_PRIVATE_KEY env var or ensure key files exist.',
    )
  })()

/**
 * The RSA public key for verifying JWTs. Read from the `JWT_PUBLIC_KEY`
 * environment variable, or loaded from the PEM file on disk.
 *
 * Throws at startup if neither source provides a key.
 */
export const JWT_PUBLIC_KEY =
  normalizePem(process.env.JWT_PUBLIC_KEY || false) ||
  (fs.existsSync(publicKeyPath) && fs.readFileSync(publicKeyPath)) ||
  (() => {
    throw new Error(
      'JWT public key not found. Set JWT_PUBLIC_KEY env var or ensure key files exist.',
    )
  })()
