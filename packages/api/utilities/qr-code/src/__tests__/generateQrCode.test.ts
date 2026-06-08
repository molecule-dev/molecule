/**
 * Unit tests for `@molecule/api-qr-code`.
 *
 * Coverage:
 * - SVG / PNG / data-URL output for `generateQrCode`.
 * - All four error-correction levels (`L` / `M` / `Q` / `H`).
 * - Custom foreground / background colors (3- and 6-digit hex).
 * - PNG byte prefix is the canonical 89 50 4E 47 0D 0A 1A 0A signature.
 * - data-URL format starts with the right `data:image/svg+xml;base64,` prefix
 *   and decodes back to the SVG body.
 * - HTTP handler 200 paths for png / svg / dataUrl + 400 for bad input.
 */

import { unzipSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import { buildMatrix } from '../buildMatrix.js'
import { generateQrCode } from '../generateQrCode.js'
import type { QrCodeRequest, QrCodeResponse } from '../handler.js'
import { createQrCodeHandler } from '../handler.js'
import { parseColor } from '../renderPng.js'
import {
  PNG_CONTENT_TYPE,
  type QrCodeFormat,
  type QrErrorCorrectionLevel,
  SVG_CONTENT_TYPE,
} from '../types.js'

/** Canonical 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('generateQrCode — format dispatch', () => {
  it('returns an SVG string by default', async () => {
    const out = await generateQrCode('hello')
    expect(typeof out).toBe('string')
    const svg = out as string
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="200"')
    expect(svg).toContain('height="200"')
    expect(svg).toContain('viewBox="0 0 ')
    expect(svg).toContain('<path')
    expect(svg).toContain('</svg>')
  })

  it('honours custom size in the SVG width/height attributes', async () => {
    const svg = (await generateQrCode('hello', { format: 'svg', size: 512 })) as string
    expect(svg).toContain('width="512"')
    expect(svg).toContain('height="512"')
  })

  it('returns a PNG Buffer with the canonical magic prefix', async () => {
    const out = await generateQrCode('https://example.com', { format: 'png', size: 128 })
    expect(Buffer.isBuffer(out)).toBe(true)
    const png = out as Buffer
    expect(png.slice(0, 8).equals(PNG_MAGIC)).toBe(true)
    // PNG must contain an IEND chunk.
    expect(png.toString('binary')).toContain('IEND')
    // PNG dimensions encoded in IHDR (offset 16 = width, offset 20 = height).
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    expect(width).toBeGreaterThanOrEqual(128)
    expect(height).toBe(width)
  })

  it('returns a base64 data URL for format="dataUrl"', async () => {
    const out = await generateQrCode('https://example.com', { format: 'dataUrl' })
    expect(typeof out).toBe('string')
    const dataUrl = out as string
    expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    const base64 = dataUrl.slice('data:image/svg+xml;base64,'.length)
    const decoded = Buffer.from(base64, 'base64').toString('utf8')
    expect(decoded.startsWith('<svg')).toBe(true)
    expect(decoded).toContain('</svg>')
  })

  it('rejects an unknown format', async () => {
    await expect(
      // @ts-expect-error — exercising runtime validation
      generateQrCode('hello', { format: 'gif' }),
    ).rejects.toThrow(/Unsupported format/)
  })

  it('rejects an empty value', async () => {
    await expect(generateQrCode('')).rejects.toThrow(/non-empty string/)
  })
})

describe('generateQrCode — error-correction levels', () => {
  const levels: QrErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H']
  for (const level of levels) {
    it(`encodes successfully at level ${level}`, async () => {
      const svg = (await generateQrCode('test-payload', {
        format: 'svg',
        errorCorrection: level,
      })) as string
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain('<path')
    })
  }

  it('higher levels produce denser matrices for the same payload', () => {
    // Same input, different EC level — H should require >= as many modules as L.
    const lo = buildMatrix('payload', 'L')
    const hi = buildMatrix('payload', 'H')
    expect(hi.moduleCount).toBeGreaterThanOrEqual(lo.moduleCount)
  })
})

describe('generateQrCode — custom colors', () => {
  it('embeds custom hex colors in the SVG output', async () => {
    const svg = (await generateQrCode('hello', {
      format: 'svg',
      fgColor: '#ff00aa',
      bgColor: '#fafafa',
    })) as string
    expect(svg).toContain('fill="#fafafa"')
    expect(svg).toContain('fill="#ff00aa"')
  })

  it('renders custom colors into the PNG pixel buffer', async () => {
    const out = await generateQrCode('hello', {
      format: 'png',
      size: 64,
      fgColor: '#ff0000',
      bgColor: '#0000ff',
    })
    const png = out as Buffer
    // Find the IDAT chunk and decompress it; check the first scanline byte
    // of pixel data is the foreground or background red/blue.
    const idatStart = png.indexOf(Buffer.from('IDAT', 'ascii'))
    expect(idatStart).toBeGreaterThan(0)
    const idatLen = png.readUInt32BE(idatStart - 4)
    const idatData = png.subarray(idatStart + 4, idatStart + 4 + idatLen)
    const raw = unzipSync(idatData)
    // First byte is the filter type (0). Next 3 bytes are R, G, B of pixel (0,0).
    expect(raw[0]).toBe(0)
    const [r, g, b] = [raw[1]!, raw[2]!, raw[3]!]
    // Top-left should be background blue (#0000ff): R=0, G=0, B=255.
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(255)
  })

  it('accepts 3-digit hex shorthand', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255])
    expect(parseColor('#000')).toEqual([0, 0, 0])
    expect(parseColor('#abc')).toEqual([0xaa, 0xbb, 0xcc])
  })

  it('accepts 6-digit hex with or without `#`', () => {
    expect(parseColor('#1f2937')).toEqual([0x1f, 0x29, 0x37])
    expect(parseColor('1f2937')).toEqual([0x1f, 0x29, 0x37])
  })

  it('rejects unsupported color formats', () => {
    expect(() => parseColor('rgb(0,0,0)')).toThrow(/Unsupported color/)
    expect(() => parseColor('red')).toThrow(/Unsupported color/)
    expect(() => parseColor('#1234')).toThrow(/Unsupported color/)
  })
})

describe('generateQrCode — margin and size', () => {
  it('applies margin in the SVG viewBox', async () => {
    const svg = (await generateQrCode('hi', { format: 'svg', margin: 4 })) as string
    // viewBox total = moduleCount + 2 * margin. For 'hi' at default EC='M'
    // module count is 21 (type 1), so total should be 21 + 8 = 29.
    expect(svg).toContain('viewBox="0 0 29 29"')
  })

  it('rejects negative margin', async () => {
    await expect(generateQrCode('hi', { margin: -1 })).rejects.toThrow(
      /margin must be a non-negative/,
    )
  })
})

describe('createQrCodeHandler', () => {
  function fakeRes(): QrCodeResponse & {
    headers: Record<string, string>
    status: number
    body: Buffer | string | unknown
    bodyKind: 'buffer' | 'text' | 'json' | null
  } {
    const headers: Record<string, string> = {}
    let status = 200
    let body: Buffer | string | unknown = null
    let bodyKind: 'buffer' | 'text' | 'json' | null = null
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
      sendText: (txt) => {
        body = txt
        bodyKind = 'text'
      },
      sendJson: (j) => {
        body = j
        bodyKind = 'json'
      },
    } as unknown as QrCodeResponse & {
      headers: Record<string, string>
      status: number
      body: Buffer | string | unknown
      bodyKind: 'buffer' | 'text' | 'json' | null
    }
  }

  it('returns 200 + image/png with PNG bytes by default', async () => {
    const handle = createQrCodeHandler()
    const req: QrCodeRequest = { params: { value: 'hello' }, query: {} }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(PNG_CONTENT_TYPE)
    expect(res.bodyKind).toBe('buffer')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect((res.body as Buffer).slice(0, 8).equals(PNG_MAGIC)).toBe(true)
    expect(res.headers['Content-Length']).toBe(String((res.body as Buffer).byteLength))
  })

  it('respects ?format=svg and returns image/svg+xml', async () => {
    const handle = createQrCodeHandler()
    const req: QrCodeRequest = {
      params: { value: 'hello' },
      query: { format: 'svg', size: '300' },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(SVG_CONTENT_TYPE)
    expect(res.bodyKind).toBe('text')
    const svg = res.body as string
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('width="300"')
  })

  it('respects ?format=dataUrl and returns text/plain', async () => {
    const handle = createQrCodeHandler()
    const req: QrCodeRequest = {
      params: { value: 'hello' },
      query: { format: 'dataUrl' },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toContain('text/plain')
    expect(res.bodyKind).toBe('text')
    expect((res.body as string).startsWith('data:image/svg+xml;base64,')).toBe(true)
  })

  it('decodes URL-encoded path values', async () => {
    const handle = createQrCodeHandler({ defaultFormat: 'svg' })
    const req: QrCodeRequest = {
      // a value containing `:` and `/` typically arrives URL-encoded.
      params: { value: encodeURIComponent('https://example.com/x?y=1') },
      query: {},
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect((res.body as string).startsWith('<svg')).toBe(true)
  })

  it('returns 400 on missing path value', async () => {
    const handle = createQrCodeHandler()
    const req = { params: { value: '' }, query: {} } as QrCodeRequest
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(400)
    expect(res.bodyKind).toBe('json')
  })

  it('returns 400 on bad format', async () => {
    const handle = createQrCodeHandler()
    const res = fakeRes()
    await handle({ params: { value: 'hi' }, query: { format: 'gif' } }, res)
    expect(res.status).toBe(400)
    expect(res.bodyKind).toBe('json')
    expect((res.body as { error: string }).error).toMatch(/format must be one of/)
  })

  it('returns 400 on size > maxSize', async () => {
    const handle = createQrCodeHandler({ maxSize: 256 })
    const res = fakeRes()
    await handle({ params: { value: 'hi' }, query: { size: '999' } }, res)
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toMatch(/size must be ≤ 256/)
  })

  it('returns 400 on bad errorCorrection', async () => {
    const handle = createQrCodeHandler()
    const res = fakeRes()
    await handle({ params: { value: 'hi' }, query: { errorCorrection: 'X' } }, res)
    expect(res.status).toBe(400)
  })

  it('runs the optional pre-flight validator', async () => {
    const handle = createQrCodeHandler({
      validate: (value) => {
        if (value.length > 100) throw new Error('Payload too long')
      },
    })
    const res = fakeRes()
    await handle({ params: { value: 'a'.repeat(200) }, query: {} }, res)
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toBe('Payload too long')
  })

  it('honours all format defaults when overridden via options', async () => {
    const handle = createQrCodeHandler({ defaultFormat: 'svg' as QrCodeFormat, defaultSize: 333 })
    const res = fakeRes()
    await handle({ params: { value: 'hi' }, query: {} }, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(SVG_CONTENT_TYPE)
    expect(res.body as string).toContain('width="333"')
  })
})
