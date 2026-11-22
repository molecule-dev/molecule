// @vitest-environment jsdom
/**
 * Unit tests for the Solid `CanvasEdge` — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/CanvasEdge.test.tsx`: the
 * same test names and behavioral assertions, rendered with Solid in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { buildEdgePath, CanvasEdge } = await import('../CanvasEdge.jsx')
const { cleanup, mountView } = await import('./helpers.jsx')

afterEach(cleanup)

describe('buildEdgePath', () => {
  it('builds a straight line for kind="line"', () => {
    expect(buildEdgePath({ x: 0, y: 0 }, { x: 100, y: 50 }, 'line')).toBe('M 0 0 L 100 50')
  })

  it('builds a horizontal-then-vertical orthogonal path', () => {
    expect(buildEdgePath({ x: 0, y: 0 }, { x: 100, y: 50 }, 'orthogonal')).toBe(
      'M 0 0 L 100 0 L 100 50',
    )
  })

  it('builds a cubic bezier with horizontal-first handles', () => {
    const d = buildEdgePath({ x: 0, y: 0 }, { x: 200, y: 100 }, 'bezier')
    expect(d.startsWith('M 0 0 C ')).toBe(true)
    // Handles offset by max(20, |dx|/2) = 100, both at same y as endpoints.
    expect(d).toContain('100 0')
    expect(d).toContain('100 100')
  })
})

describe('<CanvasEdge>', () => {
  it('renders an SVG with the canvas-edge data-mol-id', () => {
    const container = mountView(() => <CanvasEdge from={{ x: 0, y: 0 }} to={{ x: 100, y: 100 }} />)
    expect(container.querySelector('[data-mol-id="canvas-edge"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="canvas-edge-path"]')).not.toBeNull()
  })

  it('exposes the edge kind on a data attr', () => {
    const container = mountView(() => (
      <CanvasEdge from={{ x: 0, y: 0 }} to={{ x: 100, y: 100 }} kind="bezier" />
    ))
    const svg = container.querySelector('[data-mol-id="canvas-edge"]')!
    expect(svg.getAttribute('data-edge-kind')).toBe('bezier')
  })

  it('positions the SVG to span the endpoint bounding box (with margin)', () => {
    const container = mountView(() => (
      <CanvasEdge from={{ x: 50, y: 60 }} to={{ x: 150, y: 110 }} />
    ))
    const svg = container.querySelector('[data-mol-id="canvas-edge"]') as SVGElement
    const left = svg.style.left
    const top = svg.style.top
    // margin defaults to max(20, 8) = 20 → svg origin = (30, 40).
    expect(left).toBe('30px')
    expect(top).toBe('40px')
  })
})
