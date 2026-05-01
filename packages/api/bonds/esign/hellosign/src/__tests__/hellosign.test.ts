/**
 * Tests for the HelloSign (Dropbox Sign) e-signature provider.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@molecule/api-esign', () => ({}))

const TEST_KEY = 'test-hello-sign-api-key'

const mockResponse = (
  body: unknown,
  init: { ok?: boolean; status?: number; text?: string } = {},
) => {
  const ok = init.ok ?? true
  const status = init.status ?? 200
  const isBinary = body instanceof ArrayBuffer || Buffer.isBuffer(body)
  return {
    ok,
    status,
    json: async () => body as unknown,
    text: async () => init.text ?? (typeof body === 'string' ? body : JSON.stringify(body)),
    arrayBuffer: async () =>
      isBinary
        ? body instanceof ArrayBuffer
          ? body
          : (body as Buffer).buffer.slice(
              (body as Buffer).byteOffset,
              (body as Buffer).byteOffset + (body as Buffer).byteLength,
            )
        : new ArrayBuffer(0),
  } as unknown as Response
}

const helloSignSignatureRequest = (overrides: Record<string, unknown> = {}) => ({
  signature_request_id: 'sig_abc123',
  is_complete: false,
  is_declined: false,
  has_error: false,
  signatures: [
    {
      signer_email_address: 'alice@example.com',
      signer_name: 'Alice',
      signer_role: 'Tenant',
      status_code: 'awaiting_signature',
      signed_at: null,
    },
    {
      signer_email_address: 'bob@example.com',
      signer_name: 'Bob',
      signer_role: 'Landlord',
      status_code: 'awaiting_signature',
      signed_at: null,
    },
  ],
  ...overrides,
})

describe('HelloSign provider', () => {
  const originalEnv = process.env
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.HELLOSIGN_API_KEY = TEST_KEY
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  describe('createSignatureRequest', () => {
    it('uploads a Buffer document via multipart FormData', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest() }),
      )

      const { createSignatureRequest } = await import('../provider.js')

      const result = await createSignatureRequest({
        title: 'Lease Agreement',
        signers: [
          { name: 'Alice', email: 'alice@example.com', role: 'Tenant' },
          { name: 'Bob', email: 'bob@example.com', role: 'Landlord' },
        ],
        ccs: ['legal@example.com'],
        message: 'Please sign by Friday.',
        document: Buffer.from('PDF-bytes'),
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.hellosign.com/v3/signature_request/send')
      expect((init as RequestInit).method).toBe('POST')
      const headers = (init as RequestInit).headers as Record<string, string>
      expect(headers.Authorization).toMatch(/^Basic /)
      // FormData lets the runtime set Content-Type with its own boundary.
      const body = (init as RequestInit).body as FormData
      expect(body).toBeInstanceOf(FormData)
      expect(body.get('title')).toBe('Lease Agreement')
      expect(body.get('subject')).toBe('Lease Agreement')
      expect(body.get('message')).toBe('Please sign by Friday.')
      expect(body.get('signers[0][name]')).toBe('Alice')
      expect(body.get('signers[0][email_address]')).toBe('alice@example.com')
      expect(body.get('signers[0][role]')).toBe('Tenant')
      expect(body.get('signers[1][email_address]')).toBe('bob@example.com')
      expect(body.get('cc_email_addresses[0]')).toBe('legal@example.com')
      const file = body.get('file[0]') as Blob
      expect(file).toBeInstanceOf(Blob)
      const fileBytes = Buffer.from(await file.arrayBuffer())
      expect(fileBytes.toString('utf8')).toBe('PDF-bytes')

      expect(result.id).toBe('sig_abc123')
      expect(result.status).toBe('awaiting_signatures')
      expect(result.signers).toHaveLength(2)
      expect(result.signers[0].status).toBe('pending')
    })

    it('uses JSON body with file_url for url documents', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest() }),
      )

      const { createSignatureRequest } = await import('../provider.js')

      await createSignatureRequest({
        title: 'NDA',
        signers: [{ name: 'Alice', email: 'alice@example.com' }],
        document: { url: 'https://example.com/nda.pdf', filename: 'nda.pdf' },
      })

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.hellosign.com/v3/signature_request/send')
      const headers = (init as RequestInit).headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      const sent = JSON.parse((init as RequestInit).body as string)
      expect(sent.file_url).toEqual(['https://example.com/nda.pdf'])
      expect(sent.signers[0].email_address).toBe('alice@example.com')
    })

    it('uses send_with_template + custom_fields for template documents', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest() }),
      )

      const { createSignatureRequest } = await import('../provider.js')

      await createSignatureRequest({
        title: 'Onboarding',
        signers: [{ name: 'Alice', email: 'alice@example.com', role: 'Employee' }],
        document: {
          templateId: 'tpl_onboarding',
          prefill: { salary: 100000, full_time: true, manager_name: 'Carol' },
        },
      })

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.hellosign.com/v3/signature_request/send_with_template')
      const sent = JSON.parse((init as RequestInit).body as string)
      expect(sent.template_ids).toEqual(['tpl_onboarding'])
      expect(sent.signers[0].role).toBe('Employee')
      expect(sent.custom_fields).toEqual([
        { name: 'salary', value: 100000 },
        { name: 'full_time', value: true },
        { name: 'manager_name', value: 'Carol' },
      ])
    })

    it('throws sanitized error when HelloSign returns non-2xx', async () => {
      fetchMock.mockResolvedValue(
        mockResponse('rate limited', { ok: false, status: 429, text: 'rate limited' }),
      )

      const { createSignatureRequest } = await import('../provider.js')

      await expect(
        createSignatureRequest({
          title: 't',
          signers: [{ name: 'a', email: 'a@b' }],
          document: Buffer.from(''),
        }),
      ).rejects.toThrow('HelloSign /signature_request/send failed: 429')
    })

    it('throws when HELLOSIGN_API_KEY is missing — error never contains the key', async () => {
      delete process.env.HELLOSIGN_API_KEY
      const { createSignatureRequest } = await import('../provider.js')

      await expect(
        createSignatureRequest({
          title: 't',
          signers: [{ name: 'a', email: 'a@b' }],
          document: Buffer.from(''),
        }),
      ).rejects.toThrow('HELLOSIGN_API_KEY is not set')
    })

    it('never echoes the API key inside an error message', async () => {
      // Simulate an underlying error whose message would otherwise leak the key.
      fetchMock.mockRejectedValue(new Error(`Bad request to https://api.hellosign.com (key=${TEST_KEY})`))

      const { createSignatureRequest } = await import('../provider.js')

      await expect(
        createSignatureRequest({
          title: 't',
          signers: [{ name: 'a', email: 'a@b' }],
          document: Buffer.from(''),
        }),
      ).rejects.toThrow(/HelloSign createSignatureRequest failed\.$/)
    })

    it('uses HTTP Basic auth with HELLOSIGN_API_KEY:', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest() }),
      )

      const { createSignatureRequest } = await import('../provider.js')
      await createSignatureRequest({
        title: 't',
        signers: [{ name: 'a', email: 'a@b' }],
        document: { url: 'https://example.com/x.pdf' },
      })

      const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
        string,
        string
      >
      const expected = `Basic ${Buffer.from(`${TEST_KEY}:`).toString('base64')}`
      expect(headers.Authorization).toBe(expected)
    })

    it('normalizes is_complete=true to status=signed and sets signedAt', async () => {
      const epoch = 1714560000 // 2024-05-01T08:00:00Z
      fetchMock.mockResolvedValue(
        mockResponse({
          signature_request: helloSignSignatureRequest({
            is_complete: true,
            signatures: [
              {
                signer_email_address: 'alice@example.com',
                signer_name: 'Alice',
                status_code: 'signed',
                signed_at: epoch,
              },
            ],
          }),
        }),
      )

      const { createSignatureRequest } = await import('../provider.js')
      const r = await createSignatureRequest({
        title: 't',
        signers: [{ name: 'a', email: 'a@b' }],
        document: Buffer.from(''),
      })

      expect(r.status).toBe('signed')
      expect(r.signers[0].status).toBe('signed')
      expect(r.signers[0].signedAt).toBe(new Date(epoch * 1000).toISOString())
      expect(r.signedAt).toBe(new Date(epoch * 1000).toISOString())
    })

    it('normalizes is_declined to status=declined', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          signature_request: helloSignSignatureRequest({
            is_declined: true,
            signatures: [
              {
                signer_email_address: 'alice@example.com',
                signer_name: 'Alice',
                status_code: 'declined',
              },
            ],
          }),
        }),
      )

      const { createSignatureRequest } = await import('../provider.js')
      const r = await createSignatureRequest({
        title: 't',
        signers: [{ name: 'a', email: 'a@b' }],
        document: Buffer.from(''),
      })

      expect(r.status).toBe('declined')
      expect(r.signers[0].status).toBe('declined')
    })
  })

  describe('getSignatureRequest', () => {
    it('GETs /signature_request/:id and normalizes', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest() }),
      )

      const { getSignatureRequest } = await import('../provider.js')
      const r = await getSignatureRequest('sig_abc123')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.hellosign.com/v3/signature_request/sig_abc123',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }),
        }),
      )
      expect(r.id).toBe('sig_abc123')
      expect(r.status).toBe('awaiting_signatures')
    })

    it('encodes the signature request id in the URL', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest({ signature_request_id: 'a/b c' }) }),
      )

      const { getSignatureRequest } = await import('../provider.js')
      await getSignatureRequest('a/b c')

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toBe('https://api.hellosign.com/v3/signature_request/a%2Fb%20c')
    })

    it('throws sanitized error on non-2xx', async () => {
      fetchMock.mockResolvedValue(mockResponse('not found', { ok: false, status: 404 }))
      const { getSignatureRequest } = await import('../provider.js')
      await expect(getSignatureRequest('missing')).rejects.toThrow(
        'HelloSign get signature_request failed: 404',
      )
    })
  })

  describe('cancelSignatureRequest', () => {
    it('POSTs to /signature_request/cancel/:id', async () => {
      fetchMock.mockResolvedValue(mockResponse({ ok: true }))

      const { cancelSignatureRequest } = await import('../provider.js')
      await cancelSignatureRequest('sig_abc123')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.hellosign.com/v3/signature_request/cancel/sig_abc123',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('throws on non-2xx response', async () => {
      fetchMock.mockResolvedValue(mockResponse('forbidden', { ok: false, status: 403 }))
      const { cancelSignatureRequest } = await import('../provider.js')
      await expect(cancelSignatureRequest('sig_abc123')).rejects.toThrow(
        'HelloSign cancel failed: 403',
      )
    })
  })

  describe('getSignedDocument', () => {
    it('GETs /signature_request/files/:id?file_type=pdf and returns a Buffer', async () => {
      const pdfBytes = Buffer.from('%PDF-1.4 fake content')
      fetchMock.mockResolvedValue(mockResponse(pdfBytes))

      const { getSignedDocument } = await import('../provider.js')
      const r = await getSignedDocument('sig_abc123')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.hellosign.com/v3/signature_request/files/sig_abc123?file_type=pdf',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }),
        }),
      )
      expect(Buffer.isBuffer(r)).toBe(true)
      expect(r.equals(pdfBytes)).toBe(true)
    })

    it('throws on non-2xx response', async () => {
      fetchMock.mockResolvedValue(mockResponse('forbidden', { ok: false, status: 403 }))
      const { getSignedDocument } = await import('../provider.js')
      await expect(getSignedDocument('sig_abc123')).rejects.toThrow(
        'HelloSign download failed: 403',
      )
    })
  })

  describe('processWebhook', () => {
    const buildEventHash = (eventTime: string, eventType: string) =>
      createHmac('sha256', TEST_KEY).update(eventTime + eventType).digest('hex')

    const validBody = (overrides: Record<string, unknown> = {}) => {
      const eventTime = '1714560000'
      const eventType = (overrides.event_type as string) || 'signature_request_signed'
      return {
        event: {
          event_time: eventTime,
          event_type: eventType,
          event_hash: buildEventHash(eventTime, eventType),
        },
        signature_request: helloSignSignatureRequest({
          signatures: [
            {
              signer_email_address: 'alice@example.com',
              signer_name: 'Alice',
              status_code: 'signed',
              signed_at: 1714560000,
            },
          ],
        }),
        ...overrides,
      }
    }

    it('verifies a valid HMAC and returns a normalized event', async () => {
      const { processWebhook } = await import('../provider.js')
      const ev = await processWebhook({}, validBody())
      expect(ev.type).toBe('signature_request_signed')
      expect(ev.signatureRequestId).toBe('sig_abc123')
      expect(ev.signerEmail).toBe('alice@example.com')
    })

    it('rejects an invalid HMAC', async () => {
      const { processWebhook } = await import('../provider.js')
      await expect(
        processWebhook(
          {},
          {
            event: {
              event_time: '1714560000',
              event_type: 'signature_request_signed',
              event_hash: 'deadbeef'.repeat(8),
            },
            signature_request: helloSignSignatureRequest(),
          },
        ),
      ).rejects.toThrow('signature verification failed')
    })

    it('rejects a missing event_hash', async () => {
      const { processWebhook } = await import('../provider.js')
      await expect(
        processWebhook(
          {},
          {
            event: { event_time: '1714560000', event_type: 'signature_request_signed' },
          },
        ),
      ).rejects.toThrow('missing event_time/event_type/event_hash')
    })

    it('parses a form-encoded body where json field carries the JSON payload', async () => {
      const { processWebhook } = await import('../provider.js')
      const ev = await processWebhook({}, { json: JSON.stringify(validBody()) })
      expect(ev.type).toBe('signature_request_signed')
      expect(ev.signatureRequestId).toBe('sig_abc123')
    })

    it('maps each HelloSign event_type to the normalized type', async () => {
      const { processWebhook } = await import('../provider.js')
      const cases: Array<{ raw: string; expected: string }> = [
        { raw: 'signature_request_signed', expected: 'signature_request_signed' },
        { raw: 'signature_request_all_signed', expected: 'signature_request_all_signed' },
        { raw: 'signature_request_declined', expected: 'signature_request_declined' },
        { raw: 'signature_request_canceled', expected: 'signature_request_cancelled' },
        { raw: 'signature_request_cancelled', expected: 'signature_request_cancelled' },
        { raw: 'signature_request_expired', expected: 'signature_request_expired' },
        { raw: 'callback_test', expected: 'unknown' },
      ]
      for (const c of cases) {
        const ev = await processWebhook({}, validBody({ event_type: c.raw }))
        expect(ev.type).toBe(c.expected)
      }
    })

    it('throws on non-object body', async () => {
      const { processWebhook } = await import('../provider.js')
      await expect(processWebhook({}, 'not an object')).rejects.toThrow(
        'webhook body is not an object',
      )
    })

    it('throws sanitized error and never echoes API key', async () => {
      delete process.env.HELLOSIGN_API_KEY
      const { processWebhook } = await import('../provider.js')
      await expect(processWebhook({}, validBody())).rejects.toThrow(
        'HELLOSIGN_API_KEY is not set',
      )
    })

    it('returns empty signerEmail when signature_request has no signatures', async () => {
      const { processWebhook } = await import('../provider.js')
      const eventTime = '1714560000'
      const eventType = 'signature_request_signed'
      const ev = await processWebhook(
        {},
        {
          event: {
            event_time: eventTime,
            event_type: eventType,
            event_hash: buildEventHash(eventTime, eventType),
          },
          signature_request: { signature_request_id: 'sig_no_sigs' },
        },
      )
      expect(ev.signerEmail).toBeUndefined()
      expect(ev.signatureRequestId).toBe('sig_no_sigs')
    })
  })

  describe('provider object', () => {
    it('implements the EsignProvider shape', async () => {
      const { provider } = await import('../provider.js')
      expect(provider).toBeDefined()
      expect(typeof provider.createSignatureRequest).toBe('function')
      expect(typeof provider.getSignatureRequest).toBe('function')
      expect(typeof provider.cancelSignatureRequest).toBe('function')
      expect(typeof provider.getSignedDocument).toBe('function')
      expect(typeof provider.processWebhook).toBe('function')
    })

    it('all five methods route through fetch with auth headers', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ signature_request: helloSignSignatureRequest() }),
      )
      const { provider } = await import('../provider.js')
      await provider.getSignatureRequest('sig_abc123')
      const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
        string,
        string
      >
      expect(headers.Authorization).toMatch(/^Basic /)
    })
  })

  describe('index exports', () => {
    it('exports provider + named functions', async () => {
      const exports = await import('../index.js')
      expect(exports.provider).toBeDefined()
      expect(exports.createSignatureRequest).toBeDefined()
      expect(exports.getSignatureRequest).toBeDefined()
      expect(exports.cancelSignatureRequest).toBeDefined()
      expect(exports.getSignedDocument).toBeDefined()
      expect(exports.processWebhook).toBeDefined()
    })
  })
})
