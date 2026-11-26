// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `CanvasSurface` — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/CanvasSurface.test.tsx`: the
 * same test names and behavioral assertions, rendered with Svelte in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { default: CanvasSurface } = await import('../CanvasSurface.svelte')
const { cleanup, firePointer, mountValues } = await import('./helpers.js')

afterEach(cleanup)

describe('<CanvasSurface>', () => {
  it('renders a labelled root with role="application"', () => {
    const mounted = mountValues(CanvasSurface, { width: 400, height: 300 })
    const root = mounted.container.querySelector('[data-mol-id="canvas-surface"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
  })

  it('exposes viewport state on the inner layer via data attrs', () => {
    const mounted = mountValues(CanvasSurface, {
      viewport: { x: 10, y: 20, zoom: 2 },
      onViewportChange: () => {},
      width: 400,
      height: 300,
    })
    const inner = mounted.container.querySelector('[data-mol-id="canvas-surface-inner"]')!
    expect(inner.getAttribute('data-canvas-zoom')).toBe('2')
    expect(inner.getAttribute('data-canvas-x')).toBe('10')
    expect(inner.getAttribute('data-canvas-y')).toBe('20')
  })

  it('zooms on wheel and keeps the focal point fixed', () => {
    const onChange = vi.fn<(v: { x: number; y: number; zoom: number }) => void>()
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
      const mounted = mountValues(CanvasSurface, {
        viewport: { x: 0, y: 0, zoom: 1 },
        onViewportChange: (next: { x: number; y: number; zoom: number }) => {
          onChange(next)
          mounted.update({ viewport: next })
        },
        width: 400,
        height: 300,
      })
      const root = mounted.container.querySelector('[data-mol-id="canvas-surface"]') as HTMLElement
      // Wheel up at (100, 100) — zoom in.
      root.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true }),
      )
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

  it('pans on primary-button drag of the empty surface', () => {
    const onChange = vi.fn<(v: { x: number; y: number; zoom: number }) => void>()
    const mounted = mountValues(CanvasSurface, {
      viewport: { x: 0, y: 0, zoom: 1 },
      onViewportChange: (next: { x: number; y: number; zoom: number }) => {
        onChange(next)
        mounted.update({ viewport: next })
      },
      width: 400,
      height: 300,
    })
    const root = mounted.container.querySelector('[data-mol-id="canvas-surface"]') as HTMLElement
    firePointer(root, 'pointerdown', { clientX: 100, clientY: 100 })
    firePointer(root, 'pointermove', { clientX: 110, clientY: 120 })
    firePointer(root, 'pointerup', { clientX: 110, clientY: 120 })
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
    // Drag right+down by (10, 20) at zoom 1 → viewport origin moves left+up.
    expect(last.x).toBeCloseTo(-10, 6)
    expect(last.y).toBeCloseTo(-20, 6)
  })

  it('fires onBackgroundPointerDown for empty-area clicks', () => {
    const onBg = vi.fn()
    const mounted = mountValues(CanvasSurface, {
      width: 400,
      height: 300,
      onBackgroundPointerDown: onBg,
    })
    const root = mounted.container.querySelector('[data-mol-id="canvas-surface"]')!
    firePointer(root, 'pointerdown')
    expect(onBg).toHaveBeenCalledTimes(1)
  })
})
