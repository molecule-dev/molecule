/**
 * Tests covering the public surface of `@molecule/api-esign`:
 *
 * - Module exports
 * - Type shapes (compile-time checked, runtime-asserted)
 * - Document polymorphism (Buffer / url / templateId)
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type {
  CreateSignatureRequestInput,
  EsignDocument,
  EsignProvider,
  EsignWebhookEvent,
  EsignWebhookEventType,
  SignatureRequest,
  SignatureRequestStatus,
  Signer,
  SignerStatus,
  SignerWithStatus,
} from '../index.js'

describe('@molecule/api-esign module exports', () => {
  it('exports the provider accessor functions', async () => {
    const mod = await import('../index.js')
    expect(typeof mod.setProvider).toBe('function')
    expect(typeof mod.getProvider).toBe('function')
    expect(typeof mod.hasProvider).toBe('function')
  })

  it('exports the convenience helpers', async () => {
    const mod = await import('../index.js')
    expect(typeof mod.createSignatureRequest).toBe('function')
    expect(typeof mod.getSignatureRequest).toBe('function')
    expect(typeof mod.cancelSignatureRequest).toBe('function')
    expect(typeof mod.getSignedDocument).toBe('function')
    expect(typeof mod.processWebhook).toBe('function')
  })
})

describe('Signer / SignerWithStatus types', () => {
  it('Signer accepts name + email + optional role', () => {
    const a: Signer = { name: 'Alice', email: 'alice@example.com' }
    const b: Signer = { name: 'Bob', email: 'bob@example.com', role: 'Tenant' }
    expect(a.role).toBeUndefined()
    expect(b.role).toBe('Tenant')
  })

  it('SignerWithStatus extends Signer with status + signedAt', () => {
    const s: SignerWithStatus = {
      name: 'Alice',
      email: 'alice@example.com',
      status: 'signed',
      signedAt: '2026-05-01T12:00:00Z',
    }
    expect(s.status).toBe('signed')
    expect(s.signedAt).toBeDefined()
  })

  it('SignerStatus accepts the four allowed values', () => {
    const values: SignerStatus[] = ['pending', 'signed', 'declined', 'expired']
    expect(values).toHaveLength(4)
  })
})

describe('SignatureRequest types', () => {
  it('SignatureRequestStatus accepts the five allowed values', () => {
    const values: SignatureRequestStatus[] = [
      'awaiting_signatures',
      'signed',
      'declined',
      'cancelled',
      'expired',
    ]
    expect(values).toHaveLength(5)
  })

  it('SignatureRequest carries id + status + signers', () => {
    const req: SignatureRequest = {
      id: 'sig_1',
      status: 'awaiting_signatures',
      signers: [{ name: 'a', email: 'a@b', status: 'pending' }],
    }
    expect(req.id).toBe('sig_1')
    expect(req.signers[0].status).toBe('pending')
  })

  it('SignatureRequest may carry signedAt when fully signed', () => {
    const req: SignatureRequest = {
      id: 'sig_1',
      status: 'signed',
      signers: [{ name: 'a', email: 'a@b', status: 'signed', signedAt: '2026-05-01T00:00:00Z' }],
      signedAt: '2026-05-01T00:00:00Z',
    }
    expect(req.signedAt).toBeDefined()
  })
})

describe('EsignDocument polymorphism', () => {
  it('accepts a raw Buffer', () => {
    const doc: EsignDocument = Buffer.from('PDF')
    expect(Buffer.isBuffer(doc)).toBe(true)
  })

  it('accepts a url document descriptor', () => {
    const doc: EsignDocument = { url: 'https://example.com/lease.pdf', filename: 'lease.pdf' }
    expect('url' in doc && doc.url).toBe('https://example.com/lease.pdf')
  })

  it('accepts a template descriptor with prefill', () => {
    const doc: EsignDocument = {
      templateId: 'tpl_1',
      prefill: { rent: 1500, paid: true, tenant_name: 'Alice' },
    }
    expect('templateId' in doc && doc.templateId).toBe('tpl_1')
  })
})

describe('CreateSignatureRequestInput', () => {
  it('accepts minimum required fields', () => {
    const input: CreateSignatureRequestInput = {
      title: 'NDA',
      signers: [{ name: 'a', email: 'a@b' }],
      document: Buffer.from(''),
    }
    expect(input.title).toBe('NDA')
  })

  it('accepts ccs and message', () => {
    const input: CreateSignatureRequestInput = {
      title: 'Lease',
      signers: [{ name: 'a', email: 'a@b' }],
      document: { url: 'https://example.com/x.pdf' },
      ccs: ['legal@example.com'],
      message: 'Please sign by Friday.',
    }
    expect(input.ccs?.[0]).toBe('legal@example.com')
    expect(input.message).toContain('sign')
  })
})

describe('EsignWebhookEvent', () => {
  it('EsignWebhookEventType accepts the six allowed values', () => {
    const values: EsignWebhookEventType[] = [
      'signature_request_signed',
      'signature_request_all_signed',
      'signature_request_declined',
      'signature_request_cancelled',
      'signature_request_expired',
      'unknown',
    ]
    expect(values).toHaveLength(6)
  })

  it('EsignWebhookEvent carries type, request id, signer email, raw', () => {
    const e: EsignWebhookEvent = {
      type: 'signature_request_signed',
      signatureRequestId: 'sig_1',
      signerEmail: 'a@b',
      raw: { foo: 'bar' },
    }
    expect(e.type).toBe('signature_request_signed')
    expect(e.signerEmail).toBe('a@b')
  })
})

describe('EsignProvider shape', () => {
  it('an object implementing the five methods conforms to EsignProvider', () => {
    const stub: EsignProvider = {
      createSignatureRequest: async () => ({
        id: 'x',
        status: 'awaiting_signatures',
        signers: [],
      }),
      getSignatureRequest: async () => ({
        id: 'x',
        status: 'awaiting_signatures',
        signers: [],
      }),
      cancelSignatureRequest: async () => undefined,
      getSignedDocument: async () => Buffer.from(''),
      processWebhook: async () => ({
        type: 'unknown',
        signatureRequestId: 'x',
        raw: null,
      }),
    }
    expect(typeof stub.createSignatureRequest).toBe('function')
    expect(typeof stub.getSignatureRequest).toBe('function')
    expect(typeof stub.cancelSignatureRequest).toBe('function')
    expect(typeof stub.getSignedDocument).toBe('function')
    expect(typeof stub.processWebhook).toBe('function')
  })
})
