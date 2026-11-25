import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DOCUMENT_TEXT_SERVICE_LIMITS, MoleculeServiceError } from '../provider.js'
import { INVOICE_PDF_BASE64, invoicePdfBytes } from './fixture.js'

const RESULT = {
  text: 'INVOICE #2026-11-25\nAcme GmbH',
  pages: [{ pageNumber: 1, text: 'INVOICE #2026-11-25\nAcme GmbH' }],
  pageCount: 1,
  truncated: false,
  pagesOmitted: 0,
}

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MoleculeDocumentTextProvider', () => {
  it('extracts through the hosted service and passes the base64 document', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(RESULT), { status: 200 }) as unknown as globalThis.Response,
    )
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'https://api.molecule.dev/api/v1/services',
    })
    const result = await provider.extract({ data: invoicePdfBytes() })
    expect(result.text).toContain('INVOICE')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.molecule.dev/api/v1/services/pdf/to-text')
    const body = JSON.parse(init.body as string) as { pdf: string; options?: unknown }
    expect(body.pdf).toBe(INVOICE_PDF_BASE64)
    expect(body.options).toBeUndefined()
  })

  it('forwards password and options', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(RESULT), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    await provider.extract(
      { data: invoicePdfBytes(), password: 'opensesame' },
      { maxPages: 5, includePages: false },
    )
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as {
      options?: { password?: string; maxPages?: number; includePages?: boolean }
    }
    expect(body.options).toEqual({ password: 'opensesame', maxPages: 5, includePages: false })
  })

  it('throws the local 401 when MOLECULE_API_KEY is absent, without a request', async () => {
    const provider = createProvider({ apiKey: '' })
    await expect(provider.extract({ data: invoicePdfBytes() })).rejects.toMatchObject({
      status: 401,
      errorKey: 'hostedServices.error.tokenInvalid',
    })
  })

  it('refuses an oversized document locally (413), without a request', async () => {
    const provider = createProvider({ apiKey: 'mk_test' })
    const huge = new Uint8Array(DOCUMENT_TEXT_SERVICE_LIMITS.maxPdfBytes + 1)
    await expect(provider.extract({ data: huge })).rejects.toMatchObject({
      status: 413,
      errorKey: 'hostedServices.error.inputTooLarge',
    })
  })

  it('refuses bad input locally (400), without a request', async () => {
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.extract({ data: 'nope' as unknown as Uint8Array })).rejects.toMatchObject(
      { status: 400 },
    )
    await expect(
      provider.extract({ data: invoicePdfBytes() }, { maxPages: 501 }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      provider.extract({ data: invoicePdfBytes() }, { maxPages: 1.5 }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(provider.extract({ data: invoicePdfBytes(), password: '' })).rejects.toMatchObject(
      { status: 400 },
    )
    await expect(
      provider.extract({ data: invoicePdfBytes() }, { includePages: 'yes' as unknown as boolean }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('maps a 401 from the service to MoleculeServiceError with the scope hint', async () => {
    mockFetchOnce(401, { error: 'bad key', errorKey: 'hostedServices.error.tokenInvalid' })
    const provider = createProvider({ apiKey: 'mk_dead' })
    const error = await provider.extract({ data: invoicePdfBytes() }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MoleculeServiceError)
    expect((error as MoleculeServiceError).status).toBe(401)
    expect((error as MoleculeServiceError).errorKey).toBe('hostedServices.error.tokenInvalid')
    expect((error as MoleculeServiceError).message).toContain('broker:pdf')
  })

  it('surfaces a non-JSON error body as MoleculeServiceError', async () => {
    mockFetchOnce(502, '<html>bad gateway</html>')
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.extract({ data: invoicePdfBytes() })).rejects.toMatchObject({
      status: 502,
    })
  })

  it('refuses a response that carries no text (502)', async () => {
    mockFetchOnce(200, { pageCount: 1 })
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.extract({ data: invoicePdfBytes() })).rejects.toMatchObject({
      status: 502,
      errorKey: 'hostedServices.error.upstreamFailed',
    })
  })

  it('refuses a plain-http public services URL at construction', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })

  it('accepts loopback and private-network http services URLs', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://127.0.0.1:4321/api/v1/services' }),
    ).not.toThrow()
    expect(() =>
      createProvider({
        apiKey: 'mk_test',
        servicesUrl: 'http://host.docker.internal:4321/api/v1/services',
      }),
    ).not.toThrow()
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://10.1.2.3/api/v1/services' }),
    ).not.toThrow()
  })
})
