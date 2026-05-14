import { describe, expect, it } from 'vitest'

import { renderSvg } from '../renderSvg.js'
import type { CanvasDocument } from '../types.js'

const empty: CanvasDocument = { width: 100, height: 80, layers: [] }

function svg(doc: CanvasDocument, width?: number, height?: number): string {
  return renderSvg(doc, { format: 'svg', width, height }).toString('utf8')
}

describe('renderSvg — root <svg>', () => {
  it('emits an svg element with width/height/viewBox', () => {
    const out = svg(empty)
    expect(out.startsWith('<svg ')).toBe(true)
    expect(out).toContain('width="100"')
    expect(out).toContain('height="80"')
    expect(out).toContain('viewBox="0 0 100 80"')
    expect(out.endsWith('</svg>')).toBe(true)
  })

  it('honours width/height overrides while preserving the document viewBox', () => {
    const out = svg(empty, 200, 160)
    expect(out).toContain('width="200"')
    expect(out).toContain('height="160"')
    // viewBox stays as the document's intrinsic 100x80
    expect(out).toContain('viewBox="0 0 100 80"')
  })

  it('emits no background rect when background is unset', () => {
    expect(svg(empty)).not.toContain('<rect')
  })

  it('emits a background rect with escaped color when background is set', () => {
    const out = svg({ ...empty, background: '#fafafa' })
    expect(out).toContain('<rect x="0" y="0" width="100" height="80" fill="#fafafa"/>')
  })

  it('escapes & " < in the background color (escapeAttr does not encode >)', () => {
    const out = svg({ ...empty, background: '"><x>&y' })
    expect(out).toContain('fill="&quot;>&lt;x>&amp;y"')
  })
})

describe('renderSvg — rect layer', () => {
  it('renders an axis-aligned rect at origin with fill="none" when no fill is set', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 10, height: 12 }],
    })
    expect(out).toContain('<rect x="0" y="0" width="10" height="12" fill="none"/>')
  })

  it('renders fill + stroke + stroke-width', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [
        {
          kind: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#abc',
          stroke: '#000',
          strokeWidth: 2,
        },
      ],
    })
    expect(out).toContain('fill="#abc"')
    expect(out).toContain('stroke="#000" stroke-width="2"')
  })

  it('emits rounded corners when radius > 0', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 10, height: 10, radius: 4 }],
    })
    expect(out).toContain('rx="4" ry="4"')
  })

  it('omits rx/ry when radius is 0 or unset', () => {
    expect(
      svg({
        width: 50,
        height: 50,
        layers: [{ kind: 'rect', x: 0, y: 0, width: 10, height: 10, radius: 0 }],
      }),
    ).not.toContain('rx=')
  })
})

describe('renderSvg — ellipse layer', () => {
  it('converts box (x,y,width,height) into cx/cy/rx/ry', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'ellipse', x: 0, y: 0, width: 6, height: 8 }],
    })
    expect(out).toContain('cx="3" cy="4" rx="3" ry="4"')
  })
})

describe('renderSvg — line layer', () => {
  it('emits x1/y1/x2/y2 with stroke only (no fill)', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'line', x1: 0, y1: 1, x2: 10, y2: 11, stroke: '#000', fill: '#abc' }],
    })
    expect(out).toContain('x1="0" y1="1" x2="10" y2="11"')
    expect(out).toContain('stroke="#000"')
    // line shapeAttrs forces fill=none even if fill was set
    expect(out).toContain('fill="none"')
    expect(out).not.toContain('fill="#abc"')
  })
})

describe('renderSvg — path layer', () => {
  it('escapes & " < in the d attribute', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'path', d: 'M0,0L10,10 & "<' }],
    })
    expect(out).toContain('d="M0,0L10,10 &amp; &quot;&lt;"')
  })
})

describe('renderSvg — text layer', () => {
  it('uses defaults for fontFamily, fontSize, fontWeight, fill', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'Hi' }],
    })
    expect(out).toContain('font-family="sans-serif"')
    expect(out).toContain('font-size="16"')
    expect(out).toContain('font-weight="normal"')
    expect(out).toContain('fill="#000000"')
  })

  it('omits font-style when not italic', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a' }],
    })
    expect(out).not.toContain('font-style="italic"')
  })

  it('emits font-style="italic" when italic is true', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', italic: true }],
    })
    expect(out).toContain('font-style="italic"')
  })

  it('escapes & < > in the text body', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a & b <c> d' }],
    })
    expect(out).toContain('>a &amp; b &lt;c&gt; d</text>')
  })

  it('maps align to text-anchor', () => {
    const left = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', align: 'left' }],
    })
    const center = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', align: 'center' }],
    })
    const right = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', align: 'right' }],
    })
    expect(left).toContain('text-anchor="start"')
    expect(center).toContain('text-anchor="middle"')
    expect(right).toContain('text-anchor="end"')
  })

  it('maps baseline to dominant-baseline', () => {
    const top = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', baseline: 'top' }],
    })
    const middle = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', baseline: 'middle' }],
    })
    const bottom = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a', baseline: 'bottom' }],
    })
    const alpha = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'text', x: 0, y: 0, text: 'a' }],
    })
    expect(top).toContain('dominant-baseline="hanging"')
    expect(middle).toContain('dominant-baseline="middle"')
    expect(bottom).toContain('dominant-baseline="text-after-edge"')
    expect(alpha).toContain('dominant-baseline="alphabetic"')
  })
})

describe('renderSvg — image layer', () => {
  it('uses src verbatim when src is provided', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'image', x: 0, y: 0, width: 10, height: 10, src: 'https://x/y.png' }],
    })
    expect(out).toContain('href="https://x/y.png"')
  })

  it('passes data: URIs through verbatim', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [
        {
          kind: 'image',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          data: 'data:image/png;base64,AAAA',
        },
      ],
    })
    expect(out).toContain('href="data:image/png;base64,AAAA"')
  })

  it('prefixes "data:" when data does not already start with it', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'image', x: 0, y: 0, width: 10, height: 10, data: 'image/png;base64,AAAA' }],
    })
    expect(out).toContain('href="data:image/png;base64,AAAA"')
  })

  it('encodes a Buffer source as base64 with the supplied mimeType', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [
        {
          kind: 'image',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          buffer: Buffer.from('hi'),
          mimeType: 'image/jpeg',
        },
      ],
    })
    expect(out).toContain('href="data:image/jpeg;base64,aGk="')
  })

  it('defaults mimeType to image/png for buffer sources', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'image', x: 0, y: 0, width: 10, height: 10, buffer: Buffer.from('hi') }],
    })
    expect(out).toContain('href="data:image/png;base64,aGk="')
  })

  it('throws when no source is provided', () => {
    expect(() =>
      renderSvg(
        { width: 50, height: 50, layers: [{ kind: 'image', x: 0, y: 0, width: 10, height: 10 }] },
        { format: 'svg' },
      ),
    ).toThrowError('image layer requires one of: src, data, buffer')
  })

  it('throws when more than one source is provided', () => {
    expect(() =>
      renderSvg(
        {
          width: 50,
          height: 50,
          layers: [
            {
              kind: 'image',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              src: 'https://x/y.png',
              data: 'data:image/png;base64,AAAA',
            },
          ],
        },
        { format: 'svg' },
      ),
    ).toThrowError('image layer accepts only one of: src, data, buffer')
  })
})

describe('renderSvg — group layer', () => {
  it('wraps children in <g> with their transforms', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [
        {
          kind: 'group',
          x: 5,
          y: 10,
          children: [{ kind: 'rect', x: 0, y: 0, width: 4, height: 4 }],
        },
      ],
    })
    expect(out).toContain('<g transform="translate(5,10)">')
    expect(out).toContain('</g>')
    expect(out).toContain('<rect x="0" y="0" width="4" height="4" fill="none"/>')
  })

  it('nests groups recursively', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [
        {
          kind: 'group',
          x: 1,
          children: [
            {
              kind: 'group',
              y: 2,
              children: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1 }],
            },
          ],
        },
      ],
    })
    expect(out).toContain('<g transform="translate(1,0)">')
    expect(out).toContain('<g transform="translate(0,2)">')
  })
})

describe('renderSvg — transform attribute', () => {
  it('omits transform attr when no transform fields are set', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1 }],
    })
    expect(out).not.toContain('transform=')
  })

  it('adds rotate when rotation is set', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1, rotation: 45 }],
    })
    expect(out).toContain('transform="rotate(45)"')
  })

  it('adds scale when scaleX or scaleY is set', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1, scaleX: 2 }],
    })
    expect(out).toContain('scale(2,1)')
  })

  it('adds opacity attribute when opacity != 1', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1, opacity: 0.5 }],
    })
    expect(out).toContain('opacity="0.5"')
  })

  it('omits opacity attribute when opacity === 1', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1, opacity: 1 }],
    })
    expect(out).not.toContain('opacity=')
  })
})

describe('renderSvg — number formatting', () => {
  it('emits integers as integers', () => {
    expect(svg({ width: 100, height: 50, layers: [] })).toContain('width="100"')
  })

  it('trims trailing zeros from fractional values', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 1.25, y: 0, width: 1, height: 1 }],
    })
    expect(out).toContain('x="1.25"')
  })

  it('rounds to 4 decimal places maximum', () => {
    const out = svg({
      width: 50,
      height: 50,
      layers: [{ kind: 'rect', x: 1.234567, y: 0, width: 1, height: 1 }],
    })
    expect(out).toContain('x="1.2346"')
  })
})
