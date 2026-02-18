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
 * The RSA private key for signing JWTs. Read from the `JWT_PRIVATE_KEY`
 * environment variable, or loaded from the PEM file on disk.
 */
export const JWT_PRIVATE_KEY =
  process.env.JWT_PRIVATE_KEY ||
  (fs.existsSync(privateKeyPath) && fs.readFileSync(privateKeyPath)) ||
  ``

/**
 * The RSA public key for verifying JWTs. Read from the `JWT_PUBLIC_KEY`
 * environment variable, or loaded from the PEM file on disk.
 */
export const JWT_PUBLIC_KEY =
  process.env.JWT_PUBLIC_KEY ||
  (fs.existsSync(publicKeyPath) && fs.readFileSync(publicKeyPath)) ||
  ``
