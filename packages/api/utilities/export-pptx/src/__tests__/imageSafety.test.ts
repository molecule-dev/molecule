import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { exportPptx } from '../exportPptx.js'
import {
  assertSafeImageFormat,
  blockedFormatFromLabel,
  sniffBlockedFormat,
} from '../imageSafety.js'

/**
 * `image-size` — which pptxgenjs calls on every embedded image — has UNPATCHED
 * infinite-loop DoS flaws in exactly three parsers (GHSA-w3rx-r6r6-pgpr,
 * GHSA-5p2g-fcmc-qvqq). No fixed version exists, so the mitigation is
 * reachability: this package refuses those formats, and these tests are what
 * keep that true.
 */
const icns = () => Buffer.from([0x69, 0x63, 0x6e, 0x73, 0, 0, 0, 16, 0, 0, 0, 0])
const jxlNaked = () => Buffer.from([0xff, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
const ftypWith = (brand: string) =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]),
    Buffer.from('ftyp'),
    Buffer.from(brand),
    Buffer.from([0, 0, 0, 0]),
  ])
const png = () =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])

describe('imageSafety — magic-number sniffing', () => {
  it('identifies each vulnerable container from its bytes', () => {
    expect(sniffBlockedFormat(icns())).toBe('icns')
    expect(sniffBlockedFormat(jxlNaked())).toBe('jxl')
    expect(sniffBlockedFormat(ftypWith('jxl '))).toBe('jxl')
    for (const brand of ['heic', 'heix', 'mif1', 'msf1', 'hevc']) {
      expect(sniffBlockedFormat(ftypWith(brand))).toBe('heif')
    }
  })

  it('passes formats PowerPoint actually uses', () => {
    expect(sniffBlockedFormat(png())).toBeNull()
    expect(
      sniffBlockedFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toBeNull() // JPEG
    expect(sniffBlockedFormat(Buffer.from('GIF89a-------'))).toBeNull()
  })

  it('does not read past a short buffer', () => {
    expect(sniffBlockedFormat(Buffer.from([0x69, 0x63]))).toBeNull()
    expect(sniffBlockedFormat(Buffer.alloc(0))).toBeNull()
  })
})

describe('imageSafety — labels', () => {
  it('recognises the formats by MIME type and by extension', () => {
    expect(blockedFormatFromLabel('image/heic')).toBe('heif')
    expect(blockedFormatFromLabel('image/jxl')).toBe('jxl')
    expect(blockedFormatFromLabel('https://cdn.example.com/logo.icns')).toBe('icns')
    expect(blockedFormatFromLabel('/assets/photo.HEIC')).toBe('heif')
  })

  it('does not false-positive on innocuous names', () => {
    expect(blockedFormatFromLabel('image/png')).toBeNull()
    expect(blockedFormatFromLabel('https://example.com/heifer-farm.png')).toBeNull()
    expect(blockedFormatFromLabel(undefined)).toBeNull()
  })
})

describe('imageSafety — a declared type never overrides the bytes', () => {
  it('rejects HEIF bytes labelled image/png', () => {
    expect(() => assertSafeImageFormat({ bytes: ftypWith('heic'), mimeType: 'image/png' })).toThrow(
      /HEIF/i,
    )
  })
})

describe('exportPptx refuses the vulnerable formats end to end', () => {
  const deckWith = (element: Record<string, unknown>) => ({
    title: 'test',
    slides: [{ elements: [{ kind: 'image', x: 1, y: 1, w: 2, h: 2, ...element }] }],
  })

  it('rejects a HEIF buffer even when mislabelled', async () => {
    await expect(
      exportPptx(deckWith({ buffer: ftypWith('heic'), mimeType: 'image/png' }) as never),
    ).rejects.toThrow(/HEIF/i)
  })

  it('rejects an ICNS data URI', async () => {
    const uri = `data:image/png;base64,${icns().toString('base64')}`
    await expect(exportPptx(deckWith({ data: uri }) as never)).rejects.toThrow(/ICNS/i)
  })

  it('rejects a .heic src by extension', async () => {
    await expect(
      exportPptx(deckWith({ src: 'https://cdn.example.com/a.heic' }) as never),
    ).rejects.toThrow(/HEIF/i)
  })

  it('still exports a PNG buffer', async () => {
    const result = await exportPptx(deckWith({ buffer: png(), mimeType: 'image/png' }) as never)
    expect(result.buffer.length).toBeGreaterThan(0)
    expect(result.contentType).toContain('presentationml')
  })
})
