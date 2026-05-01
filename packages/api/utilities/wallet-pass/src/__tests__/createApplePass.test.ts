/**
 * Apple Wallet `.pkpass` integration tests.
 *
 * Generates a real RSA keypair + self-signed cert chain at test time, signs
 * a small `pass.json` payload, and then re-verifies the CMS detached
 * signature with `node-forge` (no real Apple WWDR cert involved). This
 * proves the manifest hashes are computed correctly and the CMS structure
 * is parseable by the same library iOS uses internally.
 *
 * @module
 */

import { createHash } from 'node:crypto'

import forge from 'node-forge'
import { describe, expect, test } from 'vitest'

import { createApplePass } from '../createApplePass.js'
import type { ApplePassData } from '../types.js'

import { readZipBuffer } from './zip-reader.js'

interface TestCertBundle {
  signerCertPem: string
  signerKeyPem: string
  wwdrCertPem: string
  signerCert: forge.pki.Certificate
  wwdrCert: forge.pki.Certificate
}

/**
 * Build a self-signed CA ("WWDR") + a signer cert chained off it, and
 * return both the PEM strings and forge cert handles for verification.
 *
 * @returns Self-signed CA cert + signer cert + their PEM encodings.
 */
function buildTestCertBundle(): TestCertBundle {
  const wwdrKeys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
  const wwdrCert = forge.pki.createCertificate()
  wwdrCert.publicKey = wwdrKeys.publicKey
  wwdrCert.serialNumber = '01'
  wwdrCert.validity.notBefore = new Date()
  wwdrCert.validity.notAfter = new Date(Date.now() + 1000 * 60 * 60 * 24)
  const wwdrAttrs = [{ name: 'commonName', value: 'Test WWDR' }]
  wwdrCert.setSubject(wwdrAttrs)
  wwdrCert.setIssuer(wwdrAttrs)
  wwdrCert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true },
  ])
  wwdrCert.sign(wwdrKeys.privateKey, forge.md.sha256.create())

  const signerKeys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
  const signerCert = forge.pki.createCertificate()
  signerCert.publicKey = signerKeys.publicKey
  signerCert.serialNumber = '02'
  signerCert.validity.notBefore = new Date()
  signerCert.validity.notAfter = new Date(Date.now() + 1000 * 60 * 60 * 24)
  signerCert.setSubject([{ name: 'commonName', value: 'Test Pass Type ID' }])
  signerCert.setIssuer(wwdrAttrs)
  signerCert.setExtensions([
    { name: 'keyUsage', digitalSignature: true },
    { name: 'extKeyUsage', clientAuth: true, emailProtection: true },
  ])
  signerCert.sign(wwdrKeys.privateKey, forge.md.sha256.create())

  return {
    signerCertPem: forge.pki.certificateToPem(signerCert),
    signerKeyPem: forge.pki.privateKeyToPem(signerKeys.privateKey),
    wwdrCertPem: forge.pki.certificateToPem(wwdrCert),
    signerCert,
    wwdrCert,
  }
}

const samplePass: ApplePassData = {
  formatVersion: 1,
  passTypeIdentifier: 'pass.com.example.event',
  teamIdentifier: 'ABCDE12345',
  serialNumber: 'ticket-9001',
  organizationName: 'Example Events',
  description: 'Doors open 7pm',
  eventTicket: {
    primaryFields: [{ key: 'event', label: 'EVENT', value: 'Synthwave Night' }],
  },
  barcodes: [
    {
      format: 'PKBarcodeFormatQR',
      message: 'TICKET-9001',
      messageEncoding: 'iso-8859-1',
    },
  ],
}

describe('createApplePass', () => {
  test('produces a zip with pass.json, manifest.json, signature', async () => {
    const certs = buildTestCertBundle()
    const buf = await createApplePass(samplePass, certs)
    const entries = readZipBuffer(buf)

    const names = entries.map((e) => e.name).sort()
    expect(names).toEqual(['manifest.json', 'pass.json', 'signature'])
  })

  test('manifest.json contains correct SHA-1 hashes for every other file', async () => {
    const certs = buildTestCertBundle()
    const iconBytes = Buffer.from('fake-icon-bytes')
    const buf = await createApplePass(samplePass, certs, { 'icon.png': iconBytes })
    const entries = readZipBuffer(buf)

    const manifestEntry = entries.find((e) => e.name === 'manifest.json')!
    const manifest = JSON.parse(manifestEntry.data.toString('utf8')) as Record<string, string>

    for (const entry of entries) {
      if (entry.name === 'manifest.json' || entry.name === 'signature') continue
      const expected = createHash('sha1').update(entry.data).digest('hex')
      expect(manifest[entry.name]).toBe(expected)
    }
  })

  test('signature parses as detached CMS with the signer + WWDR certs embedded', async () => {
    const certs = buildTestCertBundle()
    const buf = await createApplePass(samplePass, certs)
    const entries = readZipBuffer(buf)

    const signature = entries.find((e) => e.name === 'signature')!.data

    // Parse the CMS structure and confirm both certificates flow through.
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(signature.toString('binary')))
    const p7 = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData

    const certPems = p7.certificates.map((c) => forge.pki.certificateToPem(c))
    expect(certPems).toContain(certs.signerCertPem)
    expect(certPems).toContain(certs.wwdrCertPem)
  })

  test('signature is a detached CMS — content field absent in payload', async () => {
    const certs = buildTestCertBundle()
    const buf = await createApplePass(samplePass, certs)
    const entries = readZipBuffer(buf)

    const signature = entries.find((e) => e.name === 'signature')!.data
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(signature.toString('binary')))
    const p7 = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData

    // Detached signature ⇒ no inline content bytes.
    expect(p7.rawCapture?.content).toBeUndefined()
  })

  test('rejects malformed signer certificate without leaking key material', async () => {
    const certs = buildTestCertBundle()
    await expect(
      createApplePass(samplePass, { ...certs, signerCertPem: 'not a cert' }),
    ).rejects.toThrowError(/signer certificate/)
  })

  test('rejects malformed private key without leaking key material', async () => {
    const certs = buildTestCertBundle()
    let captured: Error | undefined
    try {
      await createApplePass(samplePass, { ...certs, signerKeyPem: 'not a key' })
    } catch (e) {
      captured = e as Error
    }
    expect(captured).toBeDefined()
    expect(captured!.message).not.toContain(certs.signerKeyPem)
    expect(captured!.message).toMatch(/private key/)
  })

  test('rejects malformed WWDR certificate', async () => {
    const certs = buildTestCertBundle()
    await expect(
      createApplePass(samplePass, { ...certs, wwdrCertPem: 'not a cert' }),
    ).rejects.toThrowError(/WWDR/)
  })
})
