/**
 * Unit tests for `@molecule/api-image-compositor`.
 *
 * Coverage:
 * - Layer composition order (later layers paint on top of earlier ones).
 * - Blend modes: `normal`, `multiply`, `screen`, `overlay`.
 * - Per-layer opacity.
 * - Mask attenuation.
 * - Final-stage `options.resize` dispatches to the codec's `resizeRaw`.
 * - Format dispatch: `png` / `jpeg` / `webp` reach `raster.encode` with the
 *   correct format argument and quality is passed through.
 * - Magic-byte verification on the encoded outputs (PNG `89 50 4E 47`,
 *   JPEG `FF D8 FF`, WebP `RIFF...WEBP`).
 * - The HTTP handler writes the right status/headers/body.
 *
 * The bonded image provider is replaced with a tiny in-process mock
 * `RasterCodec` that decodes a custom 1-byte-header marker buffer back
 * into raw RGBA. This lets us drive the compositor without ever touching
 * `sharp` or any other native dep.
 */

import { describe, expect, it, vi } from 'vitest'

import { blendChannel, composePixel } from '../blend.js'
import { compositeImage } from '../compositeImage.js'
import { compositeRgba } from '../compositeRgba.js'
import {
  contentTypeForFormat,
  createImageCompositeHandler,
  extensionForFormat,
} from '../handler.js'
import type {
  CompositeFormat,
  CompositeRequest,
  CompositeResponse,
  LayeredImage,
  RasterCodec,
  RawImage,
} from '../index.js'

/**
 * Build a raw RGBA buffer of the given size filled with a uniform color.
 *
 * @param width - Width in pixels.
 * @param height - Height in pixels.
 * @param r - Red channel.
 * @param g - Green channel.
 * @param b - Blue channel.
 * @param a - Alpha channel.
 */
function rawSolid(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): RawImage {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return { data, width, height }
}

/**
 * Encode a raw image into a tagged buffer of the form
 * `<magic><width:u32><height:u32><rgba bytes>`. This lets the mock
 * `decode` recover the exact raster from an `image` layer's `src`.
 *
 * @param raw - Raw RGBA image.
 */
function encodeMockSrc(raw: RawImage): Buffer {
  const header = Buffer.alloc(9)
  header.write('M', 0, 'ascii')
  header.writeUInt32BE(raw.width, 1)
  header.writeUInt32BE(raw.height, 5)
  return Buffer.concat([header, raw.data])
}

/**
 * Decode a buffer produced by `encodeMockSrc()` back into a raw image.
 *
 * @param buffer - Tagged source buffer.
 */
function decodeMockSrc(buffer: Buffer): RawImage {
  if (buffer.length < 9 || buffer.toString('ascii', 0, 1) !== 'M') {
    throw new Error('decodeMockSrc: not a tagged mock buffer')
  }
  const width = buffer.readUInt32BE(1)
  const height = buffer.readUInt32BE(5)
  return { data: buffer.subarray(9), width, height }
}

/**
 * Build a {@link RasterCodec} mock that encodes outputs with the magic
 * bytes for the requested format. Records every call for inspection.
 */
function makeMockCodec(): RasterCodec & {
  __calls: Array<{ name: string; args: unknown[] }>
} {
  const calls: Array<{ name: string; args: unknown[] }> = []
  return {
    __calls: calls,
    decode: vi.fn(async (buffer: Buffer) => {
      calls.push({ name: 'decode', args: [buffer] })
      return decodeMockSrc(buffer)
    }),
    encode: vi.fn(async (raw: RawImage, format: CompositeFormat, quality?: number) => {
      calls.push({ name: 'encode', args: [raw, format, quality] })
      return encodeWithMagic(raw, format, quality)
    }),
    resizeRaw: vi.fn(async (raw: RawImage, width: number, height: number) => {
      calls.push({ name: 'resizeRaw', args: [raw, width, height] })
      // Nearest-neighbor for the mock so dimensions/pixels are deterministic.
      const out = Buffer.alloc(width * height * 4)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sx = Math.min(raw.width - 1, Math.floor((x / width) * raw.width))
          const sy = Math.min(raw.height - 1, Math.floor((y / height) * raw.height))
          const srcOff = (sy * raw.width + sx) * 4
          const dstOff = (y * width + x) * 4
          out[dstOff] = raw.data[srcOff]!
          out[dstOff + 1] = raw.data[srcOff + 1]!
          out[dstOff + 2] = raw.data[srcOff + 2]!
          out[dstOff + 3] = raw.data[srcOff + 3]!
        }
      }
      return { data: out, width, height }
    }),
  }
}

/**
 * Produce a buffer with the correct magic-byte prefix for the requested
 * output format, followed by a few token bytes that include the quality
 * and dimensions so tests can assert them.
 */
function encodeWithMagic(raw: RawImage, format: CompositeFormat, quality?: number): Buffer {
  const tail = Buffer.alloc(8)
  tail.writeUInt32BE(raw.width, 0)
  tail.writeUInt16BE(raw.height & 0xffff, 4)
  tail.writeUInt8(quality ?? 0, 6)
  tail.writeUInt8(0, 7)

  switch (format) {
    case 'png': {
      const magic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      return Buffer.concat([magic, tail])
    }
    case 'jpeg': {
      const magic = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
      return Buffer.concat([magic, tail])
    }
    case 'webp': {
      // RIFF<4 byte size>WEBP
      const riff = Buffer.from('RIFF', 'ascii')
      const size = Buffer.from([0, 0, 0, 0])
      const webp = Buffer.from('WEBP', 'ascii')
      return Buffer.concat([riff, size, webp, tail])
    }
  }
}

describe('blendChannel', () => {
  it('normal returns the source channel unchanged', () => {
    expect(blendChannel('normal', 200, 50)).toBe(200)
  })
  it('multiply darkens the destination', () => {
    // (128 * 200) / 255 = 100.39 → 100
    expect(blendChannel('multiply', 128, 200)).toBe(100)
  })
  it('screen lightens the destination', () => {
    // 255 - ((255 - 128) * (255 - 200) / 255) = 227.6 → 228
    expect(blendChannel('screen', 128, 200)).toBe(228)
  })
  it('overlay branches on the destination', () => {
    // d=64 (<128) → multiply branch: 2*128*64/255 = 64.25 → 64
    expect(blendChannel('overlay', 128, 64)).toBe(64)
    // d=200 (>=128) → screen branch: 255 - 2*(255-128)*(255-200)/255 = 200.2 → 200
    expect(blendChannel('overlay', 128, 200)).toBe(200)
  })
})

describe('composePixel', () => {
  it('source-over places opaque source over transparent base', () => {
    const dst = Buffer.from([0, 0, 0, 0])
    const src = Buffer.from([255, 0, 0, 255])
    composePixel('normal', 1, dst, 0, src, 0)
    expect(Array.from(dst)).toEqual([255, 0, 0, 255])
  })

  it('opacity scales the source alpha contribution', () => {
    const dst = Buffer.from([0, 0, 0, 0])
    const src = Buffer.from([255, 0, 0, 255])
    composePixel('normal', 0.5, dst, 0, src, 0)
    // outA = 0.5 + 0*0.5 = 0.5 → 128
    expect(dst[3]).toBe(128)
    // RGB output = 255 since source covers transparent base.
    expect(dst[0]).toBe(255)
  })

  it('skips compositing when source alpha resolves to zero', () => {
    const dst = Buffer.from([10, 20, 30, 255])
    const src = Buffer.from([255, 255, 255, 0])
    composePixel('normal', 1, dst, 0, src, 0)
    expect(Array.from(dst)).toEqual([10, 20, 30, 255])
  })
})

describe('compositeRgba', () => {
  it('paints layers in stacking order — later layers on top', async () => {
    const codec = makeMockCodec()
    const doc: LayeredImage = {
      width: 2,
      height: 1,
      background: '#000000ff',
      layers: [
        { kind: 'fill', color: '#ff0000ff', position: { x: 0, y: 0, width: 2, height: 1 } },
        { kind: 'fill', color: '#00ff00ff', position: { x: 0, y: 0, width: 1, height: 1 } },
      ],
    }
    const flat = await compositeRgba(doc, codec)
    // pixel (0,0) painted by green fill on top
    expect(Array.from(flat.data.subarray(0, 4))).toEqual([0, 255, 0, 255])
    // pixel (1,0) only covered by red fill
    expect(Array.from(flat.data.subarray(4, 8))).toEqual([255, 0, 0, 255])
  })

  it('honors layer opacity', async () => {
    const codec = makeMockCodec()
    const doc: LayeredImage = {
      width: 1,
      height: 1,
      background: '#000000ff',
      layers: [
        {
          kind: 'fill',
          color: '#ffffffff',
          opacity: 0.5,
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    }
    const flat = await compositeRgba(doc, codec)
    // White over black at 0.5 opacity:
    // outA=1, outRGB = (255*0.5 + 0*1*0.5) / 1 = 127.5 → 128
    expect(flat.data[0]).toBe(128)
    expect(flat.data[3]).toBe(255)
  })

  it('multiply blend mode darkens', async () => {
    const codec = makeMockCodec()
    const doc: LayeredImage = {
      width: 1,
      height: 1,
      background: '#808080ff',
      layers: [
        {
          kind: 'fill',
          color: '#808080ff',
          blendMode: 'multiply',
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    }
    const flat = await compositeRgba(doc, codec)
    // 0x80=128 → multiply(128,128) = 64; alpha stays opaque
    expect(flat.data[0]).toBe(64)
  })

  it('screen blend mode lightens', async () => {
    const codec = makeMockCodec()
    const doc: LayeredImage = {
      width: 1,
      height: 1,
      background: '#808080ff',
      layers: [
        {
          kind: 'fill',
          color: '#808080ff',
          blendMode: 'screen',
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    }
    const flat = await compositeRgba(doc, codec)
    // screen(128,128) = 255 - (127*127)/255 = 191.76 → 192
    expect(flat.data[0]).toBe(192)
  })

  it('overlay blend mode acts as multiply on dark / screen on light', async () => {
    const codec = makeMockCodec()
    const dark: LayeredImage = {
      width: 1,
      height: 1,
      background: '#404040ff', // 64
      layers: [
        {
          kind: 'fill',
          color: '#808080ff',
          blendMode: 'overlay',
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    }
    const flatDark = await compositeRgba(dark, codec)
    // overlay(128, 64) → multiply branch: 2*128*64/255 = 64
    expect(flatDark.data[0]).toBe(64)

    const light: LayeredImage = {
      width: 1,
      height: 1,
      background: '#c0c0c0ff', // 192
      layers: [
        {
          kind: 'fill',
          color: '#808080ff',
          blendMode: 'overlay',
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    }
    const flatLight = await compositeRgba(light, codec)
    // overlay(128, 192) → screen branch: 255 - 2*(127)*(63)/255 = 192
    expect(flatLight.data[0]).toBe(192)
  })

  it('decodes image layers via the raster codec', async () => {
    const codec = makeMockCodec()
    const src = encodeMockSrc(rawSolid(2, 1, 255, 0, 0, 255))
    const doc: LayeredImage = {
      width: 2,
      height: 1,
      layers: [
        {
          kind: 'image',
          src,
          position: { x: 0, y: 0 },
        },
      ],
    }
    const flat = await compositeRgba(doc, codec)
    expect(codec.decode).toHaveBeenCalledOnce()
    expect(Array.from(flat.data.subarray(0, 4))).toEqual([255, 0, 0, 255])
  })

  it('applies a layer mask to attenuate alpha', async () => {
    const codec = makeMockCodec()
    const mask = Buffer.from([255, 0])
    const doc: LayeredImage = {
      width: 2,
      height: 1,
      background: '#00000000',
      layers: [
        {
          kind: 'fill',
          color: '#ffffffff',
          mask: { data: mask, width: 2, height: 1 },
          position: { x: 0, y: 0, width: 2, height: 1 },
        },
      ],
    }
    const flat = await compositeRgba(doc, codec)
    // Pixel 0 fully unmasked → opaque white. Pixel 1 mask=0 → fully transparent.
    expect(flat.data[3]).toBe(255)
    expect(flat.data[7]).toBe(0)
  })
})

describe('compositeImage', () => {
  const tinyDoc: LayeredImage = {
    width: 2,
    height: 2,
    background: '#ff0000ff',
    layers: [],
  }

  it('defaults to PNG and includes the PNG magic bytes', async () => {
    const codec = makeMockCodec()
    const out = await compositeImage(tinyDoc, {}, { raster: codec })
    expect(codec.encode).toHaveBeenCalledOnce()
    expect((codec.encode as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toBe('png')
    expect(Array.from(out.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  it('dispatches to JPEG when format=jpeg and includes JPEG magic bytes', async () => {
    const codec = makeMockCodec()
    const out = await compositeImage(tinyDoc, { format: 'jpeg', quality: 75 }, { raster: codec })
    expect((codec.encode as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toBe('jpeg')
    expect((codec.encode as ReturnType<typeof vi.fn>).mock.calls[0]![2]).toBe(75)
    expect(Array.from(out.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff])
  })

  it('dispatches to WebP when format=webp and emits a RIFF…WEBP header', async () => {
    const codec = makeMockCodec()
    const out = await compositeImage(tinyDoc, { format: 'webp' }, { raster: codec })
    expect((codec.encode as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toBe('webp')
    expect(out.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(out.subarray(8, 12).toString('ascii')).toBe('WEBP')
  })

  it('routes options.resize through raster.resizeRaw before encoding', async () => {
    const codec = makeMockCodec()
    await compositeImage(tinyDoc, { resize: { width: 10, height: 5 } }, { raster: codec })
    expect(codec.resizeRaw).toHaveBeenCalledOnce()
    const resizeCall = (codec.resizeRaw as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(resizeCall[1]).toBe(10)
    expect(resizeCall[2]).toBe(5)
    // Encode receives the resized raster.
    const encodedRaw = (codec.encode as ReturnType<typeof vi.fn>).mock.calls[0]![0] as RawImage
    expect(encodedRaw.width).toBe(10)
    expect(encodedRaw.height).toBe(5)
  })

  it('skips resize when target dimensions match current ones', async () => {
    const codec = makeMockCodec()
    await compositeImage(
      tinyDoc,
      { resize: { width: tinyDoc.width, height: tinyDoc.height } },
      { raster: codec },
    )
    expect(codec.resizeRaw).not.toHaveBeenCalled()
  })

  it('throws if no raster codec is bonded and none is supplied', async () => {
    // Note: bond('image') is not called in this test process.
    await expect(compositeImage(tinyDoc)).rejects.toThrow(/image provider/i)
  })
})

describe('handler — createImageCompositeHandler', () => {
  function makeRes(): CompositeResponse & {
    headers: Record<string, string>
    status: number
    buffer: Buffer | null
    json: unknown
  } {
    const headers: Record<string, string> = {}
    return {
      headers,
      status: 0,
      buffer: null,
      json: undefined,
      setHeader(name, value) {
        headers[name] = value
      },
      setStatus(s) {
        this.status = s
      },
      sendBuffer(buf) {
        this.buffer = buf
      },
      sendJson(body) {
        this.json = body
      },
    }
  }

  it('returns 400 when body is not an object', async () => {
    const codec = makeMockCodec()
    const handle = createImageCompositeHandler({ deps: { raster: codec } })
    const res = makeRes()
    await handle({ body: null } as CompositeRequest, res)
    expect(res.status).toBe(400)
    expect(res.json).toMatchObject({ error: expect.stringContaining('JSON object') })
  })

  it('returns 400 when doc.layers is missing', async () => {
    const codec = makeMockCodec()
    const handle = createImageCompositeHandler({ deps: { raster: codec } })
    const res = makeRes()
    await handle({ body: { doc: { width: 10, height: 10 } } } as CompositeRequest, res)
    expect(res.status).toBe(400)
    expect(res.json).toMatchObject({ error: expect.stringContaining('layers') })
  })

  it('returns 400 when options.format is unsupported', async () => {
    const codec = makeMockCodec()
    const handle = createImageCompositeHandler({ deps: { raster: codec } })
    const res = makeRes()
    await handle(
      {
        body: {
          doc: { width: 1, height: 1, layers: [] },
          options: { format: 'tiff' },
        },
      } as CompositeRequest,
      res,
    )
    expect(res.status).toBe(400)
    expect(res.json).toMatchObject({ error: expect.stringContaining('format') })
  })

  it('runs the validate hook and returns 400 on rejection', async () => {
    const codec = makeMockCodec()
    const handle = createImageCompositeHandler({
      deps: { raster: codec },
      validate: () => {
        throw new Error('document too large')
      },
    })
    const res = makeRes()
    await handle({ body: { doc: { width: 1, height: 1, layers: [] } } } as CompositeRequest, res)
    expect(res.status).toBe(400)
    expect(res.json).toMatchObject({ error: 'document too large' })
  })

  it('writes the composite buffer with correct headers on success', async () => {
    const codec = makeMockCodec()
    const handle = createImageCompositeHandler({ deps: { raster: codec }, filename: 'demo' })
    const res = makeRes()
    await handle(
      {
        body: {
          doc: { width: 2, height: 2, background: '#0000ffff', layers: [] },
          options: { format: 'png' },
        },
      } as CompositeRequest,
      res,
    )
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('image/png')
    expect(res.headers['Content-Disposition']).toBe('attachment; filename="demo.png"')
    expect(res.buffer).not.toBeNull()
    // PNG magic bytes
    expect(Array.from(res.buffer!.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(res.headers['Content-Length']).toBe(String(res.buffer!.byteLength))
  })

  it('maps formats to content types and extensions', () => {
    expect(contentTypeForFormat('png')).toBe('image/png')
    expect(contentTypeForFormat('jpeg')).toBe('image/jpeg')
    expect(contentTypeForFormat('webp')).toBe('image/webp')
    expect(extensionForFormat('png')).toBe('png')
    expect(extensionForFormat('jpeg')).toBe('jpg')
    expect(extensionForFormat('webp')).toBe('webp')
  })
})
