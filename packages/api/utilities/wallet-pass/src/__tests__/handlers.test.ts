/**
 * Handler tests — verify the framework-neutral request/response contract
 * + happy/error paths. Crypto is real; the resolver closures supply
 * fixtures and signing material at test time.
 *
 * @module
 */

import { generateKeyPairSync } from 'node:crypto'

import forge from 'node-forge'
import { describe, expect, test, vi } from 'vitest'

import {
  createApplePassHandler,
  createGoogleWalletPassHandler,
  type WalletPassResponse,
} from '../handlers.js'
import { type ApplePassCertificates, type ApplePassData, PKPASS_CONTENT_TYPE } from '../types.js'

/**
 * Build a fresh test cert bundle (mirrors the helper in
 * `createApplePass.test.ts` — kept inline so each test file is independent).
 *
 * @returns Self-signed cert chain.
 */
function buildTestCertBundle(): ApplePassCertificates {
  const ca = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
  const caCert = forge.pki.createCertificate()
  caCert.publicKey = ca.publicKey
  caCert.serialNumber = '01'
  caCert.validity.notBefore = new Date()
  caCert.validity.notAfter = new Date(Date.now() + 1000 * 60 * 60 * 24)
  const caAttrs = [{ name: 'commonName', value: 'Test CA' }]
  caCert.setSubject(caAttrs)
  caCert.setIssuer(caAttrs)
  caCert.setExtensions([{ name: 'basicConstraints', cA: true }])
  caCert.sign(ca.privateKey, forge.md.sha256.create())

  const signer = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
  const signerCert = forge.pki.createCertificate()
  signerCert.publicKey = signer.publicKey
  signerCert.serialNumber = '02'
  signerCert.validity.notBefore = new Date()
  signerCert.validity.notAfter = new Date(Date.now() + 1000 * 60 * 60 * 24)
  signerCert.setSubject([{ name: 'commonName', value: 'Test Signer' }])
  signerCert.setIssuer(caAttrs)
  signerCert.sign(ca.privateKey, forge.md.sha256.create())

  return {
    signerCertPem: forge.pki.certificateToPem(signerCert),
    signerKeyPem: forge.pki.privateKeyToPem(signer.privateKey),
    wwdrCertPem: forge.pki.certificateToPem(caCert),
  }
}

const samplePass: ApplePassData = {
  formatVersion: 1,
  passTypeIdentifier: 'pass.com.example.event',
  teamIdentifier: 'ABCDE12345',
  serialNumber: 'ticket-9001',
  organizationName: 'Example Events',
  description: 'Doors open 7pm',
  eventTicket: { primaryFields: [{ key: 'event', label: 'EVENT', value: 'Test' }] },
}

/**
 * Build a fresh response shim with vitest spies on every method.
 */
function makeResponse(): WalletPassResponse & {
  status?: number
  headers: Record<string, string>
  body?: Buffer | unknown
  redirected?: string
} {
  const state: {
    status?: number
    headers: Record<string, string>
    body?: Buffer | unknown
    redirected?: string
  } = { headers: {} }
  return {
    ...state,
    setHeader: vi.fn((n: string, v: string) => {
      state.headers[n] = v
    }),
    setStatus: vi.fn((s: number) => {
      state.status = s
    }),
    sendBuffer: vi.fn((b: Buffer) => {
      state.body = b
    }),
    sendJson: vi.fn((j: unknown) => {
      state.body = j
    }),
    redirect: vi.fn((url: string) => {
      state.redirected = url
    }),
    get status() {
      return state.status
    },
    get headers() {
      return state.headers
    },
    get body() {
      return state.body
    },
    get redirected() {
      return state.redirected
    },
  } as unknown as WalletPassResponse & {
    status?: number
    headers: Record<string, string>
    body?: Buffer | unknown
    redirected?: string
  }
}

describe('createApplePassHandler', () => {
  test('returns 400 for missing passId', async () => {
    const handle = createApplePassHandler({ resolve: async () => undefined })
    const res = makeResponse()
    await handle({ params: { passId: '' } }, res)
    expect(res.status).toBe(400)
  })

  test('returns 404 when resolver returns undefined', async () => {
    const handle = createApplePassHandler({ resolve: async () => undefined })
    const res = makeResponse()
    await handle({ params: { passId: 'unknown' } }, res)
    expect(res.status).toBe(404)
  })

  test('returns the .pkpass blob with correct headers on hit', async () => {
    const certs = buildTestCertBundle()
    const handle = createApplePassHandler({
      resolve: async () => ({ passData: samplePass, certificates: certs }),
    })
    const res = makeResponse()
    await handle({ params: { passId: 'ticket-9001' } }, res)

    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(PKPASS_CONTENT_TYPE)
    expect(res.headers['Content-Disposition']).toBe('attachment; filename="ticket-9001.pkpass"')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect((res.body as Buffer).byteLength).toBeGreaterThan(0)
  })
})

describe('createGoogleWalletPassHandler', () => {
  function makeKey(): string {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })
    return privateKey
  }

  test('returns 400 for missing passId', async () => {
    const handle = createGoogleWalletPassHandler({ resolve: async () => undefined })
    const res = makeResponse()
    await handle({ params: { passId: '' } }, res)
    expect(res.status).toBe(400)
  })

  test('returns 404 when resolver returns undefined', async () => {
    const handle = createGoogleWalletPassHandler({ resolve: async () => undefined })
    const res = makeResponse()
    await handle({ params: { passId: 'unknown' } }, res)
    expect(res.status).toBe(404)
  })

  test('redirects to pay.google.com with the JWT on hit', async () => {
    const handle = createGoogleWalletPassHandler({
      resolve: async () => ({
        passClass: { id: '3388000000000000000.event-class' },
        passObject: {
          id: '3388000000000000000.event-object',
          classId: '3388000000000000000.event-class',
        },
        serviceAccount: {
          clientEmail: 'wallet@example.iam.gserviceaccount.com',
          privateKey: makeKey(),
        },
      }),
    })
    const res = makeResponse()
    await handle({ params: { passId: 'ticket-1' } }, res)

    expect(res.redirected).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//)
    const jwt = res.redirected!.replace('https://pay.google.com/gp/v/save/', '')
    expect(jwt.split('.').length).toBe(3)
  })

  test('honors custom saveUrlPrefix', async () => {
    const handle = createGoogleWalletPassHandler({
      saveUrlPrefix: 'https://example.test/save/',
      resolve: async () => ({
        passClass: { id: 'class' },
        passObject: { id: 'obj', classId: 'class' },
        serviceAccount: {
          clientEmail: 'a@b.iam.gserviceaccount.com',
          privateKey: makeKey(),
        },
      }),
    })
    const res = makeResponse()
    await handle({ params: { passId: 'ticket-1' } }, res)
    expect(res.redirected).toMatch(/^https:\/\/example\.test\/save\//)
  })
})
