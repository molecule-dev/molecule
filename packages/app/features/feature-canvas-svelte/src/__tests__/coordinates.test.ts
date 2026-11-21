import { describe, expect, it } from 'vitest'

import { canvasToScreen, clampViewport, fitToBounds, screenToCanvas } from '../coordinates.js'

describe('screenToCanvas / canvasToScreen', () => {
  it('round-trips at zoom 1', () => {
    const vp = { x: 10, y: 20, zoom: 1 }
    const p = { x: 100, y: 50 }
    const c = screenToCanvas(p, vp)
    const s = canvasToScreen(c, vp)
    expect(s.x).toBeCloseTo(100, 6)
    expect(s.y).toBeCloseTo(50, 6)
  })

  it('round-trips at zoom 2', () => {
    const vp = { x: -50, y: 30, zoom: 2 }
    const p = { x: 80, y: 40 }
    const c = screenToCanvas(p, vp)
    const s = canvasToScreen(c, vp)
    expect(s.x).toBeCloseTo(80, 6)
    expect(s.y).toBeCloseTo(40, 6)
  })

  it('handles zoom 0 defensively', () => {
    const c = screenToCanvas({ x: 100, y: 0 }, { x: 0, y: 0, zoom: 0 })
    expect(Number.isFinite(c.x)).toBe(true)
    expect(Number.isFinite(c.y)).toBe(true)
  })

  it('zoom > 1 shrinks screen distances when converting to canvas', () => {
    const c = screenToCanvas({ x: 100, y: 0 }, { x: 0, y: 0, zoom: 2 })
    expect(c.x).toBeCloseTo(50, 6)
  })
})

describe('clampViewport', () => {
  it('returns input unchanged when no limits', () => {
    const vp = { x: 1, y: 2, zoom: 3 }
    expect(clampViewport(vp)).toEqual(vp)
  })

  it('clamps zoom to min/max', () => {
    const out = clampViewport({ x: 0, y: 0, zoom: 10 }, { minZoom: 0.5, maxZoom: 4 })
    expect(out.zoom).toBe(4)
    const out2 = clampViewport({ x: 0, y: 0, zoom: 0.1 }, { minZoom: 0.5, maxZoom: 4 })
    expect(out2.zoom).toBe(0.5)
  })

  it('clamps origin into bounds', () => {
    const out = clampViewport(
      { x: -100, y: 500, zoom: 1 },
      { bounds: { x: 0, y: 0, width: 200, height: 200 } },
    )
    expect(out.x).toBe(0)
    expect(out.y).toBe(200)
  })
})

describe('fitToBounds', () => {
  it('returns identity for zero-sized inputs', () => {
    const out = fitToBounds({ x: 5, y: 7, width: 0, height: 0 }, { width: 100, height: 100 })
    expect(out).toEqual({ x: 5, y: 7, zoom: 1 })
  })

  it('fits content centered with padding', () => {
    const out = fitToBounds({ x: 0, y: 0, width: 100, height: 100 }, { width: 200, height: 200 }, 0)
    // 200/100 = zoom 2, content fills the whole surface, no offset.
    expect(out.zoom).toBe(2)
    expect(out.x).toBeCloseTo(0, 6)
    expect(out.y).toBeCloseTo(0, 6)
  })

  it('fits using the smaller of the two dimensions', () => {
    const out = fitToBounds({ x: 0, y: 0, width: 100, height: 50 }, { width: 200, height: 200 })
    // height is the binding dimension: 200/50 = 4, but width 100*4 = 400 > 200,
    // so zoomX wins: 200/100 = 2.
    expect(out.zoom).toBe(2)
  })
})
