// @vitest-environment jsdom
/**
 * Unit tests for the Angular `CanvasSurface` — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/CanvasSurface.test.tsx`: the
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

import type { CanvasViewport } from '../types.js'
import { type Mounted, mountSurface, pointer } from './helpers.js'

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mountSurface(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<CanvasSurface>', () => {
  it('renders a labelled root with role="application"', async () => {
    const m = await render({ width: 400, height: 300 })
    const root = m.host.querySelector('[data-mol-id="canvas-surface"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
  })

  it('exposes viewport state on the inner layer via data attrs', async () => {
    const m = await render({
      viewport: { x: 10, y: 20, zoom: 2 },
      onViewportChange: () => {},
      width: 400,
      height: 300,
    })
    const inner = m.host.querySelector('[data-mol-id="canvas-surface-inner"]')!
    expect(inner.getAttribute('data-canvas-zoom')).toBe('2')
    expect(inner.getAttribute('data-canvas-x')).toBe('10')
    expect(inner.getAttribute('data-canvas-y')).toBe('20')
  })

  it('zooms on wheel and keeps the focal point fixed', async () => {
    const onChange = vi.fn<(v: CanvasViewport) => void>()
    const origGet = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return {
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON() {
          return {}
        },
      } as DOMRect
    }
    try {
      const m = await render({
        viewport: { x: 0, y: 0, zoom: 1 },
        onViewportChange: onChange,
        width: 400,
        height: 300,
      })
      const root = m.host.querySelector('[data-mol-id="canvas-surface"]') as HTMLElement
      // Wheel up at (100, 100) — zoom in.
      root.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
      )
      m.tick()
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
      expect(last.zoom).toBeGreaterThan(1)
      // Focal point invariant: screen (100,100) → canvas (100,100) before & after.
      const canvasFocalX = 100 / last.zoom + last.x
      const canvasFocalY = 100 / last.zoom + last.y
      expect(canvasFocalX).toBeCloseTo(100, 6)
      expect(canvasFocalY).toBeCloseTo(100, 6)
    } finally {
      Element.prototype.getBoundingClientRect = origGet
    }
  })

  it('pans on primary-button drag of the empty surface', async () => {
    const onChange = vi.fn<(v: CanvasViewport) => void>()
    const m = await render({
      viewport: { x: 0, y: 0, zoom: 1 },
      onViewportChange: onChange,
      width: 400,
      height: 300,
    })
    const root = m.host.querySelector('[data-mol-id="canvas-surface"]') as HTMLElement
    pointer(root, 'pointerdown', 100, 100)
    pointer(root, 'pointermove', 110, 120)
    pointer(root, 'pointerup', 110, 120)
    m.tick()
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
    // Drag right+down by (10, 20) at zoom 1 → viewport origin moves left+up.
    expect(last.x).toBeCloseTo(-10, 6)
    expect(last.y).toBeCloseTo(-20, 6)
  })

  it('fires onBackgroundPointerDown for empty-area clicks', async () => {
    const onBg = vi.fn()
    const m = await render({ width: 400, height: 300, onBackgroundPointerDown: onBg })
    const root = m.host.querySelector('[data-mol-id="canvas-surface"]')!
    pointer(root, 'pointerdown')
    expect(onBg).toHaveBeenCalledTimes(1)
  })
})
