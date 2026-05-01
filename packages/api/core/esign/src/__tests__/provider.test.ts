/**
 * Tests for the e-signature core provider accessor and convenience helpers.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as EsignModule from '../esign.js'
import type * as ProviderModule from '../provider.js'
import type {
  CreateSignatureRequestInput,
  EsignProvider,
  EsignWebhookEvent,
  SignatureRequest,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createSignatureRequest: typeof EsignModule.createSignatureRequest
let getSignatureRequest: typeof EsignModule.getSignatureRequest
let cancelSignatureRequest: typeof EsignModule.cancelSignatureRequest
let getSignedDocument: typeof EsignModule.getSignedDocument
let processWebhook: typeof EsignModule.processWebhook

const buildMockProvider = (overrides: Partial<EsignProvider> = {}): EsignProvider => ({
  createSignatureRequest: vi.fn(),
  getSignatureRequest: vi.fn(),
  cancelSignatureRequest: vi.fn(),
  getSignedDocument: vi.fn(),
  processWebhook: vi.fn(),
  ...overrides,
})

const sampleRequest = (): SignatureRequest => ({
  id: 'sig_123',
  status: 'awaiting_signatures',
  signers: [
    { name: 'Alice', email: 'alice@example.com', status: 'pending' },
    { name: 'Bob', email: 'bob@example.com', status: 'pending' },
  ],
})

describe('esign provider accessor', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const esignModule = await import('../esign.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createSignatureRequest = esignModule.createSignatureRequest
    getSignatureRequest = esignModule.getSignatureRequest
    cancelSignatureRequest = esignModule.cancelSignatureRequest
    getSignedDocument = esignModule.getSignedDocument
    processWebhook = esignModule.processWebhook
  })

  it('hasProvider returns false before any provider is bonded', () => {
    expect(hasProvider()).toBe(false)
  })

  it('getProvider throws when no provider is bonded', () => {
    expect(() => getProvider()).toThrow(
      'E-signature provider not configured. Call setProvider() first.',
    )
  })

  it('setProvider + getProvider return the same instance', () => {
    const mock = buildMockProvider()
    setProvider(mock)
    expect(getProvider()).toBe(mock)
    expect(hasProvider()).toBe(true)
  })

  it('setProvider replaces an existing bonded provider', () => {
    const first = buildMockProvider()
    const second = buildMockProvider()
    setProvider(first)
    setProvider(second)
    expect(getProvider()).toBe(second)
  })
})

describe('esign convenience helpers', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const esignModule = await import('../esign.js')
    setProvider = providerModule.setProvider
    createSignatureRequest = esignModule.createSignatureRequest
    getSignatureRequest = esignModule.getSignatureRequest
    cancelSignatureRequest = esignModule.cancelSignatureRequest
    getSignedDocument = esignModule.getSignedDocument
    processWebhook = esignModule.processWebhook
  })

  it('createSignatureRequest delegates to the bonded provider', async () => {
    const expected = sampleRequest()
    const create = vi.fn().mockResolvedValue(expected)
    setProvider(buildMockProvider({ createSignatureRequest: create }))

    const input: CreateSignatureRequestInput = {
      title: 'NDA',
      signers: [{ name: 'Alice', email: 'alice@example.com' }],
      document: Buffer.from('PDF'),
    }

    const result = await createSignatureRequest(input)
    expect(create).toHaveBeenCalledWith(input)
    expect(result).toBe(expected)
  })

  it('getSignatureRequest delegates with the id', async () => {
    const get = vi.fn().mockResolvedValue(sampleRequest())
    setProvider(buildMockProvider({ getSignatureRequest: get }))
    await getSignatureRequest('sig_123')
    expect(get).toHaveBeenCalledWith('sig_123')
  })

  it('cancelSignatureRequest delegates with the id and returns void', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined)
    setProvider(buildMockProvider({ cancelSignatureRequest: cancel }))
    const result = await cancelSignatureRequest('sig_123')
    expect(cancel).toHaveBeenCalledWith('sig_123')
    expect(result).toBeUndefined()
  })

  it('getSignedDocument returns the provider Buffer unchanged', async () => {
    const buf = Buffer.from('signed-pdf-bytes')
    const get = vi.fn().mockResolvedValue(buf)
    setProvider(buildMockProvider({ getSignedDocument: get }))
    const result = await getSignedDocument('sig_123')
    expect(get).toHaveBeenCalledWith('sig_123')
    expect(result).toBe(buf)
  })

  it('processWebhook forwards headers and body to the provider', async () => {
    const event: EsignWebhookEvent = {
      type: 'signature_request_signed',
      signatureRequestId: 'sig_123',
      signerEmail: 'alice@example.com',
      raw: { event_type: 'signature_request_signed' },
    }
    const proc = vi.fn().mockResolvedValue(event)
    setProvider(buildMockProvider({ processWebhook: proc }))

    const headers = { 'content-type': 'application/json' }
    const body = { event: { event_type: 'signature_request_signed' } }
    const result = await processWebhook(headers, body)

    expect(proc).toHaveBeenCalledWith(headers, body)
    expect(result).toBe(event)
  })

  it('createSignatureRequest throws when provider not bonded', async () => {
    await expect(
      createSignatureRequest({
        title: 'x',
        signers: [{ name: 'a', email: 'a@b' }],
        document: Buffer.from(''),
      }),
    ).rejects.toThrow('E-signature provider not configured')
  })

  it('getSignatureRequest throws when provider not bonded', async () => {
    await expect(getSignatureRequest('x')).rejects.toThrow('E-signature provider not configured')
  })

  it('cancelSignatureRequest throws when provider not bonded', async () => {
    await expect(cancelSignatureRequest('x')).rejects.toThrow(
      'E-signature provider not configured',
    )
  })

  it('getSignedDocument throws when provider not bonded', async () => {
    await expect(getSignedDocument('x')).rejects.toThrow('E-signature provider not configured')
  })

  it('processWebhook throws when provider not bonded', async () => {
    await expect(processWebhook({}, {})).rejects.toThrow('E-signature provider not configured')
  })

  it('propagates createSignatureRequest errors from the provider', async () => {
    const create = vi.fn().mockRejectedValue(new Error('provider boom'))
    setProvider(buildMockProvider({ createSignatureRequest: create }))
    await expect(
      createSignatureRequest({
        title: 'x',
        signers: [{ name: 'a', email: 'a@b' }],
        document: Buffer.from(''),
      }),
    ).rejects.toThrow('provider boom')
  })

  it('propagates processWebhook errors from the provider', async () => {
    const proc = vi.fn().mockRejectedValue(new Error('bad signature'))
    setProvider(buildMockProvider({ processWebhook: proc }))
    await expect(processWebhook({}, {})).rejects.toThrow('bad signature')
  })
})
