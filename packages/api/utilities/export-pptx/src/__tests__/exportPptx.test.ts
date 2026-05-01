/**
 * Unit tests for `@molecule/api-export-pptx`.
 *
 * Coverage:
 * - Deck → Buffer happy path produces a valid OOXML ZIP (PK signature,
 *   `[Content_Types].xml` part present).
 * - Text serialization round-trips into the slide XML.
 * - Image elements (`buffer`, `data`, `src`) all encode without throwing
 *   and the embedded media is present in the ZIP.
 * - Multi-slide decks produce one slide XML per slide.
 * - Chart, shape, and metadata wiring.
 * - HTTP handler writes the right headers and body.
 *
 * We use Node's built-in `zlib` to inflate ZIP entries — no extra dep is
 * needed because pptxgenjs's `nodebuffer` output is a standard ZIP.
 */

import { inflateRawSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import { exportPptx, PPTX_CONTENT_TYPE, sanitizeFilename } from '../exportPptx.js'
import { createPptxExportHandler } from '../handler.js'
import type { Deck, PptxRequest, PptxResponse } from '../index.js'

/**
 * Minimal ZIP central-directory walker. PPTX is a ZIP container, so we
 * decode it with the standard ZIP layout (local file headers + central
 * directory) using only Node built-ins. Returns a `Map<filename, content>`.
 *
 * Supports the two compression methods pptxgenjs emits: STORE (0) and
 * DEFLATE (8). Throws on anything else.
 */
function unzip(buffer: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>()

  // Locate End-of-Central-Directory record by scanning backwards.
  const EOCD_SIG = 0x06054b50
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0 && i >= buffer.length - 0xffff - 22; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Not a ZIP: EOCD signature not found')

  const totalEntries = buffer.readUInt16LE(eocd + 10)
  const cdSize = buffer.readUInt32LE(eocd + 12)
  const cdOffset = buffer.readUInt32LE(eocd + 16)

  let p = cdOffset
  for (let i = 0; i < totalEntries; i++) {
    const sig = buffer.readUInt32LE(p)
    if (sig !== 0x02014b50) throw new Error('Bad central-dir signature')
    const compressionMethod = buffer.readUInt16LE(p + 10)
    const compressedSize = buffer.readUInt32LE(p + 20)
    const uncompressedSize = buffer.readUInt32LE(p + 24)
    const fileNameLen = buffer.readUInt16LE(p + 28)
    const extraFieldLen = buffer.readUInt16LE(p + 30)
    const commentLen = buffer.readUInt16LE(p + 32)
    const localHeaderOffset = buffer.readUInt32LE(p + 42)
    const fileName = buffer.slice(p + 46, p + 46 + fileNameLen).toString('utf8')

    // Read local file header to find the actual data offset.
    const lh = localHeaderOffset
    if (buffer.readUInt32LE(lh) !== 0x04034b50) {
      throw new Error('Bad local-header signature')
    }
    const lhFileNameLen = buffer.readUInt16LE(lh + 26)
    const lhExtraFieldLen = buffer.readUInt16LE(lh + 28)
    const dataStart = lh + 30 + lhFileNameLen + lhExtraFieldLen
    const compressed = buffer.slice(dataStart, dataStart + compressedSize)

    let content: Buffer
    if (compressionMethod === 0) {
      content = compressed
    } else if (compressionMethod === 8) {
      content = inflateRawSync(compressed)
    } else {
      throw new Error(`Unsupported compression method ${compressionMethod} for ${fileName}`)
    }

    if (content.length !== uncompressedSize) {
      throw new Error(`Size mismatch on ${fileName}: ${content.length} vs ${uncompressedSize}`)
    }

    out.set(fileName, content)
    p += 46 + fileNameLen + extraFieldLen + commentLen
  }

  if (p !== cdOffset + cdSize) {
    // Tolerate trailing data; not strictly an error.
  }

  return out
}

/**
 * 1×1 transparent PNG (67 bytes) — useful as a fixture for image tests.
 */
const ONE_PX_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100' +
    '0d0a2db40000000049454e44ae426082',
  'hex',
)

describe('exportPptx', () => {
  it('produces a valid PPTX ZIP buffer with the right Content_Types', async () => {
    const deck: Deck = {
      title: 'Smoke',
      slides: [{ elements: [{ kind: 'text', x: 1, y: 1, w: 4, h: 1, body: 'Hi' }] }],
    }
    const result = await exportPptx(deck)

    expect(Buffer.isBuffer(result.buffer)).toBe(true)
    // Every ZIP starts with the local-file-header magic "PK\x03\x04".
    expect(result.buffer.slice(0, 4).toString('hex')).toBe('504b0304')
    expect(result.contentType).toBe(PPTX_CONTENT_TYPE)
    expect(result.filename).toBe('Smoke.pptx')

    const entries = unzip(result.buffer)
    // Mandatory OOXML container parts.
    expect(entries.has('[Content_Types].xml')).toBe(true)
    expect(entries.has('_rels/.rels')).toBe(true)
    expect(entries.has('ppt/presentation.xml')).toBe(true)

    // Content_Types references the presentation MIME.
    const ct = entries.get('[Content_Types].xml')!.toString('utf8')
    expect(ct).toMatch(/presentationml\.presentation/)
  })

  it('serializes text body content into the slide XML', async () => {
    const deck: Deck = {
      slides: [
        {
          elements: [
            {
              kind: 'text',
              x: 0.5,
              y: 0.5,
              w: 8,
              h: 1.5,
              body: 'Hello, World!',
              fontSize: 32,
              bold: true,
              color: '#1f2937',
              align: 'center',
            },
          ],
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    // pptxgenjs names slide XML files ppt/slides/slide1.xml, ...
    const slide1 = entries.get('ppt/slides/slide1.xml')
    expect(slide1).toBeDefined()
    const xml = slide1!.toString('utf8')
    expect(xml).toContain('Hello, World!')
    // Bold attr <a:rPr ... b="1">
    expect(xml).toMatch(/b="1"/)
    // Color hex (without leading #) lands in <a:srgbClr val="...">
    expect(xml).toMatch(/srgbClr val="1F2937"|srgbClr val="1f2937"/i)
    // Center alignment: <a:pPr algn="ctr">
    expect(xml).toMatch(/algn="ctr"/)
  })

  it('produces one slide XML per slide for multi-slide decks', async () => {
    const deck: Deck = {
      title: 'Multi',
      slides: [
        { elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'One' }] },
        { elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'Two' }] },
        { elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'Three' }] },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    expect(entries.has('ppt/slides/slide1.xml')).toBe(true)
    expect(entries.has('ppt/slides/slide2.xml')).toBe(true)
    expect(entries.has('ppt/slides/slide3.xml')).toBe(true)
    expect(entries.has('ppt/slides/slide4.xml')).toBe(false)

    expect(entries.get('ppt/slides/slide1.xml')!.toString('utf8')).toContain('One')
    expect(entries.get('ppt/slides/slide2.xml')!.toString('utf8')).toContain('Two')
    expect(entries.get('ppt/slides/slide3.xml')!.toString('utf8')).toContain('Three')
  })

  it('embeds images supplied as a Buffer', async () => {
    const deck: Deck = {
      slides: [
        {
          elements: [
            {
              kind: 'image',
              x: 0,
              y: 0,
              w: 1,
              h: 1,
              buffer: ONE_PX_PNG,
              mimeType: 'image/png',
              altText: 'pixel',
            },
          ],
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    // pptxgenjs writes embedded images under ppt/media/. The exact count
    // is implementation-detail (pptxgenjs may emit a placeholder media
    // file alongside the real one); we just want at least one PNG part.
    const media = [...entries.keys()].filter((k) => k.startsWith('ppt/media/'))
    expect(media.length).toBeGreaterThanOrEqual(1)
    expect(media.some((m) => /\.png$/i.test(m))).toBe(true)
    // Slide should reference the image relationship.
    const slide1 = entries.get('ppt/slides/slide1.xml')!.toString('utf8')
    expect(slide1).toMatch(/<p:pic\b/)
  })

  it('embeds images supplied as a data: URI', async () => {
    const dataUri = `data:image/png;base64,${ONE_PX_PNG.toString('base64')}`
    const deck: Deck = {
      slides: [
        {
          elements: [{ kind: 'image', x: 0, y: 0, w: 1, h: 1, data: dataUri }],
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    const media = [...entries.keys()].filter((k) => k.startsWith('ppt/media/'))
    expect(media.length).toBeGreaterThanOrEqual(1)
    expect(media.some((m) => /\.png$/i.test(m))).toBe(true)
  })

  it('rejects image elements with no source', async () => {
    const deck: Deck = {
      slides: [
        {
          // @ts-expect-error — exercising runtime validation
          elements: [{ kind: 'image', x: 0, y: 0, w: 1, h: 1 }],
        },
      ],
    }
    await expect(exportPptx(deck)).rejects.toThrow(/requires one of: src, data, buffer/)
  })

  it('rejects image elements with multiple sources', async () => {
    const deck: Deck = {
      slides: [
        {
          elements: [
            {
              kind: 'image',
              x: 0,
              y: 0,
              w: 1,
              h: 1,
              src: 'https://example.com/a.png',
              buffer: ONE_PX_PNG,
            },
          ],
        },
      ],
    }
    await expect(exportPptx(deck)).rejects.toThrow(/accepts only one of: src, data, buffer/)
  })

  it('renders shape elements with fill and line', async () => {
    const deck: Deck = {
      slides: [
        {
          elements: [
            {
              kind: 'shape',
              shape: 'rect',
              x: 0.5,
              y: 0.5,
              w: 4,
              h: 0.05,
              fill: '#3b82f6',
              line: '#000000',
              lineWidth: 2,
            },
          ],
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    const xml = entries.get('ppt/slides/slide1.xml')!.toString('utf8')
    // Shape fill colour appears in slide XML.
    expect(xml).toMatch(/srgbClr val="3B82F6"|srgbClr val="3b82f6"/i)
  })

  it('writes basic charts with data series', async () => {
    const deck: Deck = {
      slides: [
        {
          elements: [
            {
              kind: 'chart',
              chart: 'bar',
              x: 0.5,
              y: 0.5,
              w: 6,
              h: 4,
              title: 'Revenue',
              series: [
                {
                  name: 'Q1',
                  data: [
                    { label: 'Jan', value: 10 },
                    { label: 'Feb', value: 14 },
                    { label: 'Mar', value: 9 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    // pptxgenjs stores chart parts under ppt/charts/.
    const charts = [...entries.keys()].filter((k) => k.startsWith('ppt/charts/'))
    expect(charts.length).toBeGreaterThan(0)
  })

  it('writes deck-level metadata into core.xml', async () => {
    const deck: Deck = {
      title: 'Annual Report',
      author: 'Acme Inc.',
      subject: 'Q4 2025',
      company: 'Acme',
      slides: [{ elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'TOC' }] }],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    const core = entries.get('docProps/core.xml')
    expect(core).toBeDefined()
    const xml = core!.toString('utf8')
    expect(xml).toContain('Annual Report')
    expect(xml).toContain('Acme Inc.')
    expect(xml).toContain('Q4 2025')
  })

  it('honours background color on slides', async () => {
    const deck: Deck = {
      slides: [
        {
          background: '#fef3c7',
          elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'X' }],
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    const xml = entries.get('ppt/slides/slide1.xml')!.toString('utf8')
    expect(xml).toMatch(/srgbClr val="FEF3C7"|srgbClr val="fef3c7"/i)
  })

  it('writes speaker notes when supplied', async () => {
    const deck: Deck = {
      slides: [
        {
          elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'Slide 1' }],
          notes: 'Speaker mentions Q1 revenue trend.',
        },
      ],
    }
    const result = await exportPptx(deck)
    const entries = unzip(result.buffer)
    // pptxgenjs writes notes parts under ppt/notesSlides/.
    const notesSlide = [...entries.keys()].find((k) => k.startsWith('ppt/notesSlides/notesSlide'))
    expect(notesSlide).toBeDefined()
    const xml = entries.get(notesSlide!)!.toString('utf8')
    expect(xml).toContain('Speaker mentions Q1 revenue trend.')
  })

  it('rejects non-array slides at the public API', async () => {
    // @ts-expect-error — exercising runtime validation
    await expect(exportPptx({ title: 'X' })).rejects.toThrow(/deck.slides must be an array/)
  })
})

describe('sanitizeFilename', () => {
  it('replaces illegal filesystem chars and appends .pptx', () => {
    expect(sanitizeFilename('Q1<>:"/\\|?*Update')).toBe('Q1 Update.pptx')
  })

  it('keeps an existing .pptx extension', () => {
    expect(sanitizeFilename('foo.pptx')).toBe('foo.pptx')
  })

  it('falls back to "deck" for empty input', () => {
    expect(sanitizeFilename('')).toBe('deck.pptx')
    expect(sanitizeFilename('   ')).toBe('deck.pptx')
  })
})

describe('createPptxExportHandler', () => {
  function fakeRes(): PptxResponse & {
    headers: Record<string, string>
    status: number
    body: Buffer | unknown
    bodyKind: 'buffer' | 'json' | null
  } {
    const headers: Record<string, string> = {}
    let status = 200
    let body: Buffer | unknown = null
    let bodyKind: 'buffer' | 'json' | null = null
    return {
      headers,
      get status() {
        return status
      },
      get body() {
        return body
      },
      get bodyKind() {
        return bodyKind
      },
      setHeader: (n, v) => {
        headers[n] = v
      },
      setStatus: (s) => {
        status = s
      },
      sendBuffer: (buf) => {
        body = buf
        bodyKind = 'buffer'
      },
      sendJson: (j) => {
        body = j
        bodyKind = 'json'
      },
    } as unknown as PptxResponse & {
      headers: Record<string, string>
      status: number
      body: Buffer | unknown
      bodyKind: 'buffer' | 'json' | null
    }
  }

  it('returns a buffer with attachment Content-Disposition on success', async () => {
    const handle = createPptxExportHandler()
    const req: PptxRequest = {
      body: {
        title: 'Report',
        slides: [{ elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'Hi' }] }],
      },
    }
    const res = fakeRes()
    await handle(req, res)

    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(PPTX_CONTENT_TYPE)
    expect(res.headers['Content-Disposition']).toContain('attachment')
    expect(res.headers['Content-Disposition']).toContain('Report.pptx')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect((res.body as Buffer).slice(0, 4).toString('hex')).toBe('504b0304')
    expect(res.bodyKind).toBe('buffer')
    expect(res.headers['Content-Length']).toBe(String((res.body as Buffer).byteLength))
  })

  it('accepts the { deck, options } envelope shape', async () => {
    const handle = createPptxExportHandler()
    const req: PptxRequest = {
      body: {
        deck: {
          slides: [{ elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'X' }] }],
        },
        options: { filename: 'override' },
      },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Disposition']).toContain('override.pptx')
  })

  it('returns HTTP 400 for invalid bodies', async () => {
    const handle = createPptxExportHandler()
    const res1 = fakeRes()
    await handle({ body: null }, res1)
    expect(res1.status).toBe(400)
    expect(res1.bodyKind).toBe('json')

    const res2 = fakeRes()
    await handle({ body: { title: 'no slides' } }, res2)
    expect(res2.status).toBe(400)

    const res3 = fakeRes()
    await handle({ body: { slides: 'not-an-array' } }, res3)
    expect(res3.status).toBe(400)
  })

  it('runs the optional pre-flight validator and rejects on throw', async () => {
    const handle = createPptxExportHandler({
      validate: (deck) => {
        if (deck.slides.length > 1) throw new Error('Too many slides')
      },
    })
    const req: PptxRequest = {
      body: {
        slides: [
          { elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'A' }] },
          { elements: [{ kind: 'text', x: 0, y: 0, w: 4, h: 1, body: 'B' }] },
        ],
      },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(400)
    expect(res.bodyKind).toBe('json')
    expect((res.body as { error: string }).error).toBe('Too many slides')
  })
})
