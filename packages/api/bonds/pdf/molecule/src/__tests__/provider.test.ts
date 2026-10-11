import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, PDF_SERVICE_LIMITS } from '../provider.js'

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
      ),
    )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const PDF = Buffer.from('%PDF-1.7 fake-pdf-bytes')
const RESULT = { data: 'bWVyZ2Vk', mimeType: 'application/pdf', pageCount: 3, bytes: 8 }

/** A real one-page PDF built with pdf-lib, for the local-parse methods. */
async function realPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.addPage([300, 500])
  return Buffer.from(await doc.save())
}

describe('api-pdf-molecule', () => {
  it('posts HTML to from-html and decodes the returned document', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const out = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).fromHTML('<h1>Invoice</h1>', { format: 'A4', landscape: true })
    expect(out.toString()).toBe('merged')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/pdf/from-html')
    expect(JSON.parse(String(init.body))).toEqual({
      html: '<h1>Invoice</h1>',
      options: { format: 'A4', landscape: true },
    })
  })

  it('maps merge and watermark to their request shapes', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const p = createProvider({ apiKey: 'mk_test' })
    await p.merge([PDF, PDF])
    await p.addWatermark(PDF, 'DRAFT', { fontSize: 32, opacity: 0.5 })
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)))
    expect(bodies[0]).toEqual({ pdfs: [PDF.toString('base64'), PDF.toString('base64')] })
    expect(bodies[1]).toEqual({
      pdf: PDF.toString('base64'),
      text: 'DRAFT',
      options: { fontSize: 32, opacity: 0.5 },
    })
  })

  it('refuses oversized and malformed input locally, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const p = createProvider({ apiKey: 'mk_test' })
    await expect(p.render('')).rejects.toMatchObject({ status: 400 })
    await expect(p.render('x'.repeat(PDF_SERVICE_LIMITS.maxHtmlChars + 1))).rejects.toMatchObject({
      status: 413,
    })
    await expect(p.merge([])).rejects.toMatchObject({ status: 400 })
    await expect(
      p.merge(Array.from({ length: PDF_SERVICE_LIMITS.maxMergeInputs + 1 }, () => PDF)),
    ).rejects.toMatchObject({ status: 413 })
    await expect(p.merge([Buffer.alloc(0)])).rejects.toMatchObject({ status: 400 })
    await expect(
      p.merge([Buffer.alloc(PDF_SERVICE_LIMITS.maxDocumentBytes + 1)]),
    ).rejects.toMatchObject({ status: 413 })
    await expect(p.addWatermark(PDF, '')).rejects.toMatchObject({ status: 400 })
    await expect(
      p.addWatermark(PDF, 'x'.repeat(PDF_SERVICE_LIMITS.maxWatermarkTextChars + 1)),
    ).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses fromTemplate (interpolation is caller-side)', async () => {
    stubFetch(200, RESULT)
    await expect(createProvider({ apiKey: 'mk_test' }).fromTemplate()).rejects.toMatchObject({
      status: 400,
    })
  })

  it('counts pages and reads metadata LOCALLY, with no network call', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const p = createProvider({ apiKey: 'mk_test' })
    const pdf = await realPdf()
    await expect(p.getPageCount(pdf)).resolves.toBe(1)
    const meta = await p.getMetadata(pdf)
    expect(meta.pageCount).toBe(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).fromHTML('<p>x</p>'),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a public cleartext services URL', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })
})
