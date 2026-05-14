import { describe, expect, it } from 'vitest'

import { buildMatrix } from '../buildMatrix.js'
import { buildSvgPath, renderSvg } from '../renderSvg.js'

describe('buildSvgPath', () => {
  it('returns empty string for an all-light matrix', () => {
    const fakeMatrix = {
      moduleCount: 4,
      margin: 0,
      isDark: () => false,
    }
    expect(buildSvgPath(fakeMatrix)).toBe('')
  })

  it('emits one M h v h Z run per contiguous horizontal stretch', () => {
    // 1x3 dark stripe at row 0, cols 0-2 — single run.
    const fakeMatrix = {
      moduleCount: 3,
      margin: 0,
      isDark: (row: number, col: number) => row === 0 && col >= 0 && col <= 2,
    }
    expect(buildSvgPath(fakeMatrix)).toBe('M0 0h3v1h-3z')
  })

  it('respects the margin offset in coordinates', () => {
    const fakeMatrix = {
      moduleCount: 2,
      margin: 5,
      isDark: (row: number, col: number) => row === 0 && col === 0,
    }
    // single dark module at (0,0) → run length 1 starting at (0+5, 0+5)
    expect(buildSvgPath(fakeMatrix)).toBe('M5 5h1v1h-1z')
  })

  it('produces multiple runs for non-contiguous dark modules in the same row', () => {
    // Row 0: dark, light, dark → 2 runs of length 1.
    const fakeMatrix = {
      moduleCount: 3,
      margin: 0,
      isDark: (row: number, col: number) => row === 0 && (col === 0 || col === 2),
    }
    const path = buildSvgPath(fakeMatrix)
    const runCount = (path.match(/M/g) ?? []).length
    expect(runCount).toBe(2)
  })

  it('integrates with a real built matrix without throwing', () => {
    const matrix = buildMatrix('hello world')
    const path = buildSvgPath(matrix)
    expect(path.length).toBeGreaterThan(0)
    expect(path.startsWith('M')).toBe(true)
  })
})

describe('renderSvg', () => {
  const matrix = buildMatrix('test')

  it('produces a valid SVG with the requested width/height', () => {
    const svg = renderSvg(matrix, { size: 256, fgColor: '#000', bgColor: '#fff' })
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('width="256"')
    expect(svg).toContain('height="256"')
  })

  it('sets a viewBox that includes the margin', () => {
    const svg = renderSvg(matrix, { size: 100, fgColor: '#000', bgColor: '#fff' })
    const total = matrix.moduleCount + matrix.margin * 2
    expect(svg).toContain(`viewBox="0 0 ${total} ${total}"`)
  })

  it('emits a background rect with the bgColor', () => {
    const svg = renderSvg(matrix, { size: 100, fgColor: '#000', bgColor: '#fafafa' })
    expect(svg).toContain('<rect')
    expect(svg).toContain('fill="#fafafa"')
  })

  it('emits a path with the fgColor', () => {
    const svg = renderSvg(matrix, { size: 100, fgColor: '#222222', bgColor: '#fff' })
    expect(svg).toContain('<path')
    expect(svg).toContain('fill="#222222"')
  })

  it('escapes XML metacharacters in color values', () => {
    const svg = renderSvg(matrix, {
      size: 100,
      fgColor: '"><script>alert(1)</script>',
      bgColor: '#fff',
    })
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes & in color values without double-encoding', () => {
    const svg = renderSvg(matrix, {
      size: 100,
      fgColor: 'rgba(0,0,0,0.5)&garbage',
      bgColor: '#fff',
    })
    expect(svg).toContain('rgba(0,0,0,0.5)&amp;garbage')
  })

  it('uses crispEdges shape-rendering to avoid anti-aliasing', () => {
    const svg = renderSvg(matrix, { size: 100, fgColor: '#000', bgColor: '#fff' })
    expect(svg).toContain('shape-rendering="crispEdges"')
  })
})
