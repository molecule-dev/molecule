/**
 * Unit tests for `@molecule/api-canvas-render`.
 *
 * Coverage:
 * - PNG path dispatches every shape kind to the right canvas method (rect,
 *   ellipse, line, path, text, image, group).
 * - Text rendering invokes `fillText`/`strokeText` with the right styling.
 * - SVG and PDF outputs come out structurally valid.
 * - Format dispatch returns the right contentType/extension and a Buffer
 *   whose magic-byte prefix matches the format.
 * - The HTTP handler writes the right status/headers/body.
 *
 * The native `@napi-rs/canvas` dependency is mocked via
 * `setCanvasModule()` (a tiny dependency-injection seam exposed by
 * `renderPng.ts`) — equivalent in spirit to `vi.mock('@napi-rs/canvas')`
 * but doesn't require the module ever resolving to its real binding,
 * which keeps the test runner fast and offline.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCanvasRenderHandler } from '../handler.js'
import type { CanvasDocument, CanvasRenderRequest, CanvasRenderResponse } from '../index.js'
import {
  PDF_CONTENT_TYPE,
  PNG_CONTENT_TYPE,
  renderCanvasDocument,
  SVG_CONTENT_TYPE,
} from '../renderCanvasDocument.js'
import { type Canvas2DContext, type CanvasModule, setCanvasModule } from '../renderPng.js'

/**
 * Build a fake 2D context with vitest spies on every method we care about.
 * Also collects a chronological log of method calls so dispatch can be
 * verified by ordering when it matters.
 */
function makeFakeContext(): Canvas2DContext & {
  __calls: Array<{ name: string; args: unknown[] }>
} {
  const calls: Array<{ name: string; args: unknown[] }> = []
  function spy<TName extends string>(name: TName) {
    return vi.fn((...args: unknown[]) => {
      calls.push({ name, args })
    })
  }
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save: spy('save'),
    restore: spy('restore'),
    translate: spy('translate'),
    rotate: spy('rotate'),
    scale: spy('scale'),
    beginPath: spy('beginPath'),
    closePath: spy('closePath'),
    rect: spy('rect'),
    moveTo: spy('moveTo'),
    lineTo: spy('lineTo'),
    ellipse: spy('ellipse'),
    fill: spy('fill'),
    stroke: spy('stroke'),
    fillText: spy('fillText'),
    strokeText: spy('strokeText'),
    fillRect: spy('fillRect'),
    drawImage: spy('drawImage'),
    __calls: calls,
  } as unknown as Canvas2DContext & { __calls: Array<{ name: string; args: unknown[] }> }
}

/**
 * 8-byte PNG signature prefix: 89 50 4E 47 0D 0A 1A 0A.
 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Build a fake `@napi-rs/canvas` module whose `createCanvas()` returns a
 * canvas backed by a vi-spy context. `toBuffer()` returns a buffer that
 * starts with the real PNG magic bytes — that's what the assertion
 * checks for downstream.
 */
function makeFakeCanvasModule(): {
  module: CanvasModule
  ctx: ReturnType<typeof makeFakeContext>
  toBufferSpy: ReturnType<typeof vi.fn>
} {
  const ctx = makeFakeContext()
  const toBufferSpy = vi.fn(() => Buffer.concat([PNG_MAGIC, Buffer.from('FAKE-IDAT-AND-IEND')]))
  const module: CanvasModule = {
    createCanvas: vi.fn(() => ({
      getContext: () => ctx,
      toBuffer: toBufferSpy,
    })),
  }
  return { module, ctx, toBufferSpy }
}

describe('renderCanvasDocument — format dispatch', () => {
  let fake: ReturnType<typeof makeFakeCanvasModule>

  beforeEach(() => {
    fake = makeFakeCanvasModule()
    setCanvasModule(fake.module)
  })

  afterEach(() => {
    setCanvasModule(undefined)
  })

  it('produces a PNG buffer with the right magic prefix and Content-Type', async () => {
    const doc: CanvasDocument = {
      width: 100,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 100, height: 50, fill: '#ffffff' }],
    }
    const result = await renderCanvasDocument(doc, { format: 'png' })
    expect(result.contentType).toBe(PNG_CONTENT_TYPE)
    expect(result.extension).toBe('png')
    expect(Buffer.isBuffer(result.buffer)).toBe(true)
    // First 8 bytes are the canonical PNG signature.
    expect(result.buffer.slice(0, 8).equals(PNG_MAGIC)).toBe(true)
    // The mocked canvas.toBuffer was invoked exactly once with image/png.
    expect(fake.toBufferSpy).toHaveBeenCalledTimes(1)
    expect(fake.toBufferSpy).toHaveBeenCalledWith('image/png')
  })

  it('produces an SVG buffer with the right XML root', async () => {
    const doc: CanvasDocument = {
      width: 200,
      height: 100,
      background: '#fafafa',
      layers: [{ kind: 'text', x: 10, y: 30, text: 'hi' }],
    }
    const result = await renderCanvasDocument(doc, { format: 'svg' })
    expect(result.contentType).toBe(SVG_CONTENT_TYPE)
    expect(result.extension).toBe('svg')
    const xml = result.buffer.toString('utf8')
    expect(xml.startsWith('<svg')).toBe(true)
    expect(xml).toContain('width="200"')
    expect(xml).toContain('viewBox="0 0 200 100"')
    expect(xml).toContain('fill="#fafafa"')
    expect(xml).toContain('>hi</text>')
  })

  it('produces a PDF buffer with the right magic prefix', async () => {
    const doc: CanvasDocument = {
      width: 50,
      height: 50,
      background: '#ff0000',
      layers: [],
    }
    const result = await renderCanvasDocument(doc, { format: 'pdf' })
    expect(result.contentType).toBe(PDF_CONTENT_TYPE)
    expect(result.extension).toBe('pdf')
    // PDF files start with the literal "%PDF-".
    expect(result.buffer.slice(0, 5).toString('binary')).toBe('%PDF-')
    // Trailer must include the EOF marker.
    expect(result.buffer.toString('binary')).toContain('%%EOF')
  })

  it('rejects malformed documents at the public API', async () => {
    // @ts-expect-error — exercising runtime validation
    await expect(renderCanvasDocument({ width: 1, height: 1 }, { format: 'png' })).rejects.toThrow(
      /doc\.layers must be an array/,
    )
    // @ts-expect-error — exercising runtime validation
    await expect(renderCanvasDocument({ layers: [] }, { format: 'png' })).rejects.toThrow(
      /doc\.width and doc\.height must be numbers/,
    )
  })
})

describe('renderCanvasDocument — PNG shape dispatch', () => {
  let fake: ReturnType<typeof makeFakeCanvasModule>

  beforeEach(() => {
    fake = makeFakeCanvasModule()
    setCanvasModule(fake.module)
  })

  afterEach(() => {
    setCanvasModule(undefined)
  })

  it('dispatches a rect layer to ctx.rect + fill/stroke', async () => {
    await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [
          {
            kind: 'rect',
            x: 5,
            y: 10,
            width: 20,
            height: 30,
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 2,
          },
        ],
      },
      { format: 'png' },
    )
    const names = fake.ctx.__calls.map((c) => c.name)
    expect(names).toContain('rect')
    expect(names).toContain('fill')
    expect(names).toContain('stroke')

    const rectCall = fake.ctx.__calls.find((c) => c.name === 'rect')!
    expect(rectCall.args).toEqual([5, 10, 20, 30])
  })

  it('dispatches an ellipse layer to ctx.ellipse', async () => {
    await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [
          {
            kind: 'ellipse',
            x: 10,
            y: 20,
            width: 40,
            height: 30,
            fill: '#3b82f6',
          },
        ],
      },
      { format: 'png' },
    )
    const ellipse = fake.ctx.__calls.find((c) => c.name === 'ellipse')
    expect(ellipse).toBeDefined()
    // cx, cy = top-left + half-size.
    expect(ellipse!.args[0]).toBe(30) // 10 + 40/2
    expect(ellipse!.args[1]).toBe(35) // 20 + 30/2
    expect(ellipse!.args[2]).toBe(20) // rx
    expect(ellipse!.args[3]).toBe(15) // ry
  })

  it('dispatches a line layer to ctx.moveTo + ctx.lineTo + stroke', async () => {
    await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [{ kind: 'line', x1: 0, y1: 0, x2: 50, y2: 50, stroke: '#000000' }],
      },
      { format: 'png' },
    )
    const names = fake.ctx.__calls.map((c) => c.name)
    expect(names).toContain('moveTo')
    expect(names).toContain('lineTo')
    expect(names).toContain('stroke')
    expect(names).not.toContain('fill')
  })

  it('dispatches a path layer to moveTo + lineTo from SVG path data', async () => {
    await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [{ kind: 'path', d: 'M0,0 L10,0 L10,10 Z', fill: '#000000' }],
      },
      { format: 'png' },
    )
    const moves = fake.ctx.__calls.filter((c) => c.name === 'moveTo')
    const linesTo = fake.ctx.__calls.filter((c) => c.name === 'lineTo')
    expect(moves.length).toBeGreaterThanOrEqual(1)
    expect(linesTo.length).toBeGreaterThanOrEqual(2)
    // Closing 'Z' triggers closePath.
    expect(fake.ctx.__calls.some((c) => c.name === 'closePath')).toBe(true)
  })

  it('dispatches an image layer to ctx.drawImage with the resolved source', async () => {
    const buf = Buffer.from([1, 2, 3])
    await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [{ kind: 'image', x: 0, y: 0, width: 10, height: 10, buffer: buf }],
      },
      { format: 'png' },
    )
    const draw = fake.ctx.__calls.find((c) => c.name === 'drawImage')
    expect(draw).toBeDefined()
    expect(draw!.args[0]).toBe(buf)
    expect(draw!.args).toEqual([buf, 0, 0, 10, 10])
  })

  it('rejects an image layer with no source', async () => {
    await expect(
      renderCanvasDocument(
        {
          width: 100,
          height: 100,
          // @ts-expect-error — exercising runtime validation
          layers: [{ kind: 'image', x: 0, y: 0, width: 10, height: 10 }],
        },
        { format: 'png' },
      ),
    ).rejects.toThrow(/requires one of: src, data, buffer/)
  })

  it('rejects an image layer with multiple sources', async () => {
    await expect(
      renderCanvasDocument(
        {
          width: 100,
          height: 100,
          layers: [
            {
              kind: 'image',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              src: 'https://x',
              buffer: Buffer.from([0]),
            },
          ],
        },
        { format: 'png' },
      ),
    ).rejects.toThrow(/accepts only one of: src, data, buffer/)
  })

  it('recurses into a group layer and applies its transform', async () => {
    await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [
          {
            kind: 'group',
            x: 50,
            y: 50,
            children: [
              { kind: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#000' },
              { kind: 'rect', x: 0, y: 20, width: 10, height: 10, fill: '#000' },
            ],
          },
        ],
      },
      { format: 'png' },
    )
    const rectCalls = fake.ctx.__calls.filter((c) => c.name === 'rect')
    expect(rectCalls).toHaveLength(2)
    // Group's transform produced at least one translate(50, 50) call.
    expect(
      fake.ctx.__calls.some((c) => c.name === 'translate' && c.args[0] === 50 && c.args[1] === 50),
    ).toBe(true)
  })
})

describe('renderCanvasDocument — text rendering invocation', () => {
  let fake: ReturnType<typeof makeFakeCanvasModule>

  beforeEach(() => {
    fake = makeFakeCanvasModule()
    setCanvasModule(fake.module)
  })

  afterEach(() => {
    setCanvasModule(undefined)
  })

  it('invokes fillText with the right text + position for a fill-only text layer', async () => {
    await renderCanvasDocument(
      {
        width: 200,
        height: 100,
        layers: [
          {
            kind: 'text',
            x: 12,
            y: 34,
            text: 'Hello',
            fontSize: 24,
            fontFamily: 'Inter',
            fontWeight: 700,
            fill: '#ff00aa',
            align: 'center',
            baseline: 'middle',
          },
        ],
      },
      { format: 'png' },
    )
    const fillText = fake.ctx.__calls.find((c) => c.name === 'fillText')
    expect(fillText).toBeDefined()
    expect(fillText!.args).toEqual(['Hello', 12, 34])
    // strokeText not called because no stroke is configured.
    expect(fake.ctx.__calls.some((c) => c.name === 'strokeText')).toBe(false)
  })

  it('invokes strokeText when a stroke is set', async () => {
    await renderCanvasDocument(
      {
        width: 200,
        height: 100,
        layers: [
          {
            kind: 'text',
            x: 0,
            y: 0,
            text: 'Outlined',
            stroke: '#000000',
            strokeWidth: 3,
            fill: '#ffffff',
          },
        ],
      },
      { format: 'png' },
    )
    expect(fake.ctx.__calls.some((c) => c.name === 'fillText')).toBe(true)
    expect(fake.ctx.__calls.some((c) => c.name === 'strokeText')).toBe(true)
  })
})

describe('renderCanvasDocument — SVG output details', () => {
  it('serializes a rect with rounded corners and stroke', async () => {
    const doc: CanvasDocument = {
      width: 200,
      height: 100,
      layers: [
        {
          kind: 'rect',
          x: 10,
          y: 10,
          width: 50,
          height: 30,
          radius: 8,
          fill: '#3b82f6',
          stroke: '#000000',
          strokeWidth: 2,
        },
      ],
    }
    const result = await renderCanvasDocument(doc, { format: 'svg' })
    const svg = result.buffer.toString('utf8')
    expect(svg).toContain('<rect')
    expect(svg).toContain('rx="8"')
    expect(svg).toContain('fill="#3b82f6"')
    expect(svg).toContain('stroke="#000000"')
    expect(svg).toContain('stroke-width="2"')
  })

  it('escapes special characters in text content', async () => {
    const result = await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [{ kind: 'text', x: 0, y: 0, text: '<a> & </a>' }],
      },
      { format: 'svg' },
    )
    const svg = result.buffer.toString('utf8')
    expect(svg).toContain('&lt;a&gt; &amp; &lt;/a&gt;')
    expect(svg).not.toContain('<a>')
  })

  it('renders nested groups', async () => {
    const result = await renderCanvasDocument(
      {
        width: 100,
        height: 100,
        layers: [
          {
            kind: 'group',
            x: 10,
            y: 10,
            children: [
              {
                kind: 'group',
                rotation: 45,
                children: [{ kind: 'rect', x: 0, y: 0, width: 5, height: 5, fill: '#000' }],
              },
            ],
          },
        ],
      },
      { format: 'svg' },
    )
    const svg = result.buffer.toString('utf8')
    // Two opening <g> tags, two closing </g> tags.
    expect((svg.match(/<g/g) ?? []).length).toBe(2)
    expect((svg.match(/<\/g>/g) ?? []).length).toBe(2)
    expect(svg).toContain('rotate(45)')
  })
})

describe('createCanvasRenderHandler', () => {
  let fake: ReturnType<typeof makeFakeCanvasModule>

  beforeEach(() => {
    fake = makeFakeCanvasModule()
    setCanvasModule(fake.module)
  })

  afterEach(() => {
    setCanvasModule(undefined)
  })

  function fakeRes(): CanvasRenderResponse & {
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
    } as unknown as CanvasRenderResponse & {
      headers: Record<string, string>
      status: number
      body: Buffer | unknown
      bodyKind: 'buffer' | 'json' | null
    }
  }

  it('returns 200 with attachment headers for a valid PNG request', async () => {
    const handle = createCanvasRenderHandler({ filename: 'design' })
    const req: CanvasRenderRequest = {
      body: {
        doc: {
          width: 50,
          height: 50,
          layers: [{ kind: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#fff' }],
        },
        options: { format: 'png' },
      },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(PNG_CONTENT_TYPE)
    expect(res.headers['Content-Disposition']).toContain('attachment')
    expect(res.headers['Content-Disposition']).toContain('design.png')
    expect(res.bodyKind).toBe('buffer')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect((res.body as Buffer).slice(0, 8).equals(PNG_MAGIC)).toBe(true)
  })

  it('returns 200 with image/svg+xml for an svg request', async () => {
    const handle = createCanvasRenderHandler()
    const req: CanvasRenderRequest = {
      body: {
        doc: { width: 10, height: 10, layers: [] },
        options: { format: 'svg' },
      },
    }
    const res = fakeRes()
    await handle(req, res)
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe(SVG_CONTENT_TYPE)
    expect(res.headers['Content-Disposition']).toContain('canvas.svg')
  })

  it('returns 400 for malformed bodies', async () => {
    const handle = createCanvasRenderHandler()

    const r1 = fakeRes()
    await handle({ body: null }, r1)
    expect(r1.status).toBe(400)

    const r2 = fakeRes()
    await handle({ body: { doc: {} } }, r2)
    expect(r2.status).toBe(400)

    const r3 = fakeRes()
    await handle({ body: { doc: { width: 10, height: 10, layers: [] } } }, r3)
    expect(r3.status).toBe(400) // missing options.format

    const r4 = fakeRes()
    await handle(
      {
        body: {
          doc: { width: 10, height: 10, layers: [] },
          options: { format: 'gif' },
        },
      },
      r4,
    )
    expect(r4.status).toBe(400)
  })

  it('runs the optional pre-flight validator', async () => {
    const handle = createCanvasRenderHandler({
      validate: (doc) => {
        if (doc.width > 1000) throw new Error('Too wide')
      },
    })
    const res = fakeRes()
    await handle(
      {
        body: {
          doc: { width: 5000, height: 100, layers: [] },
          options: { format: 'svg' },
        },
      },
      res,
    )
    expect(res.status).toBe(400)
    expect(res.bodyKind).toBe('json')
    expect((res.body as { error: string }).error).toBe('Too wide')
  })
})
