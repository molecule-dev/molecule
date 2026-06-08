/**
 * Apple Wallet `.pkpass` generator.
 *
 * Produces the standard PassKit zip layout:
 *
 * ```
 * pass.json
 * manifest.json   ← SHA-1 hashes of every other file in the zip
 * signature       ← detached CMS signature over manifest.json
 * icon.png ...    ← optional asset attachments
 * ```
 *
 * The CMS detached signature is produced via `node-forge` using the
 * developer-portal "Pass Type ID" cert as the signer, the matching private
 * key, and Apple's WWDR intermediate as an additional certificate in the
 * CMS structure (Apple Wallet validates the chain on-device).
 *
 * @module
 */

import { createHash } from 'node:crypto'

import forge from 'node-forge'

import type { ApplePassAssets, ApplePassCertificates, ApplePassData } from './types.js'
import { buildZipBuffer, type ZipFileEntry } from './zip.js'

/**
 * Generate a fully-signed Apple Wallet `.pkpass` archive.
 *
 * @param passData - The `pass.json` payload (see {@link ApplePassData}).
 * @param certificates - Signing material — see {@link ApplePassCertificates}.
 * @param assets - Optional file-name → bytes map (icon.png, logo.png, ...).
 * @returns A `Buffer` of the zipped, signed `.pkpass` ready to send with
 *   `Content-Type: application/vnd.apple.pkpass`.
 *
 * @example
 * ```ts
 * import { readFileSync } from 'node:fs'
 * import { createApplePass } from '@molecule/api-wallet-pass'
 *
 * const pkpass = await createApplePass(
 *   {
 *     formatVersion: 1,
 *     passTypeIdentifier: 'pass.com.example.event',
 *     teamIdentifier: 'ABCDE12345',
 *     serialNumber: 'ticket-9001',
 *     organizationName: 'Example Events',
 *     description: 'Doors open 7pm',
 *     eventTicket: { primaryFields: [{ key: 'event', label: 'EVENT', value: 'Synthwave Night' }] },
 *     barcodes: [{ format: 'PKBarcodeFormatQR', message: 'TICKET-9001', messageEncoding: 'iso-8859-1' }],
 *   },
 *   {
 *     signerCertPem: readFileSync('./certs/signer.pem', 'utf8'),
 *     signerKeyPem: readFileSync('./certs/signer.key', 'utf8'),
 *     wwdrCertPem: readFileSync('./certs/wwdr.pem', 'utf8'),
 *   },
 *   { 'icon.png': readFileSync('./assets/icon.png') },
 * )
 * ```
 */
export async function createApplePass(
  passData: ApplePassData,
  certificates: ApplePassCertificates,
  assets: ApplePassAssets = {},
): Promise<Buffer> {
  const passJson = Buffer.from(JSON.stringify(passData), 'utf8')

  const fileEntries: ZipFileEntry[] = [{ name: 'pass.json', data: passJson }]
  for (const [name, data] of Object.entries(assets)) {
    fileEntries.push({
      name,
      data: data instanceof Buffer ? data : Buffer.from(data),
    })
  }

  const manifest: Record<string, string> = {}
  for (const entry of fileEntries) {
    manifest[entry.name] = sha1(entry.data)
  }
  const manifestJson = Buffer.from(JSON.stringify(manifest), 'utf8')

  const signature = signManifest(manifestJson, certificates)

  return buildZipBuffer([
    ...fileEntries,
    { name: 'manifest.json', data: manifestJson },
    { name: 'signature', data: signature },
  ])
}

/**
 * Compute a SHA-1 hex digest of arbitrary bytes.
 *
 * @param data - Bytes to hash.
 * @returns Lowercase 40-char hex digest.
 */
function sha1(data: Buffer): string {
  return createHash('sha1').update(data).digest('hex')
}

/**
 * Build a CMS / PKCS#7 detached signature over `manifest.json` using the
 * Apple PassKit-required cert chain. Translates `node-forge` errors into
 * generic messages — never lets private-key material leak into thrown
 * errors or log output.
 *
 * @param manifest - The `manifest.json` bytes to sign.
 * @param certificates - PEM cert + key bundle.
 * @returns DER-encoded CMS detached signature suitable for writing to
 *   the `signature` entry inside the .pkpass zip.
 */
function signManifest(manifest: Buffer, certificates: ApplePassCertificates): Buffer {
  let signerCert: forge.pki.Certificate
  let wwdrCert: forge.pki.Certificate
  let signerKey: forge.pki.PrivateKey

  try {
    signerCert = forge.pki.certificateFromPem(certificates.signerCertPem)
  } catch (error) {
    throw new Error('Invalid Apple Wallet signer certificate (signerCertPem).', { cause: error })
  }

  try {
    wwdrCert = forge.pki.certificateFromPem(certificates.wwdrCertPem)
  } catch (error) {
    throw new Error('Invalid Apple WWDR intermediate certificate (wwdrCertPem).', { cause: error })
  }

  try {
    signerKey = certificates.password
      ? forge.pki.decryptRsaPrivateKey(certificates.signerKeyPem, certificates.password)
      : forge.pki.privateKeyFromPem(certificates.signerKeyPem)
    if (!signerKey) {
      throw new Error('decrypt failed')
    }
  } catch (error) {
    throw new Error('Invalid Apple Wallet signer private key (signerKeyPem).', { cause: error })
  }

  const p7 = forge.pkcs7.createSignedData()
  // node-forge requires content as a forge ByteBuffer for binary input.
  p7.content = forge.util.createBuffer(manifest.toString('binary'))
  p7.addCertificate(signerCert)
  p7.addCertificate(wwdrCert)
  p7.addSigner({
    key: signerKey,
    certificate: signerCert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
    ],
  })

  // Detached: the manifest bytes themselves are NOT embedded in the CMS.
  p7.sign({ detached: true })

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
  return Buffer.from(der, 'binary')
}
