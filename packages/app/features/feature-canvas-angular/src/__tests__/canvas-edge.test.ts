// @vitest-environment jsdom
/**
 * Unit tests for the Angular `CanvasEdge` — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/CanvasEdge.test.tsx`: the
 * same test names and behavioral assertions, mounted through Angular's real
 * renderer and asserted on the markup the component produces.
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
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { buildEdgePath } from '../canvas-edge.component.js'
import { type Mounted, mountEdge } from './helpers.js'

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mountEdge(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

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
  it('renders an SVG with the canvas-edge data-mol-id', async () => {
    const m = await render({ from: { x: 0, y: 0 }, to: { x: 100, y: 100 } })
    expect(m.host.querySelector('[data-mol-id="canvas-edge"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="canvas-edge-path"]')).not.toBeNull()
  })

  it('exposes the edge kind on a data attr', async () => {
    const m = await render({ from: { x: 0, y: 0 }, to: { x: 100, y: 100 }, kind: 'bezier' })
    const svg = m.host.querySelector('[data-mol-id="canvas-edge"]')!
    expect(svg.getAttribute('data-edge-kind')).toBe('bezier')
  })

  it('positions the SVG to span the endpoint bounding box (with margin)', async () => {
    const m = await render({ from: { x: 50, y: 60 }, to: { x: 150, y: 110 } })
    const svg = m.host.querySelector('[data-mol-id="canvas-edge"]') as SVGElement
    const left = svg.style.left
    const top = svg.style.top
    // margin defaults to max(20, 8) = 20 → svg origin = (30, 40).
    expect(left).toBe('30px')
    expect(top).toBe('40px')
  })
})
