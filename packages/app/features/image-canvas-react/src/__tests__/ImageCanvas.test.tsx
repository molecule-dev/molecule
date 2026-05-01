// @vitest-environment jsdom

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  clamp,
  clampPan,
  composeFilterString,
  ImageCanvas,
  screenToCanvas,
} from '../ImageCanvas.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Stub `getContext` on `HTMLCanvasElement` so render passes don't throw
 * in jsdom. Returns a recording stub the test can inspect.
 *
 * @returns The stubbed context recorder.
 */
function stubCanvasContext() {
  const calls: { method: string; args: unknown[] }[] = []
  let lastFilter = 'none'
  const ctx = {
    save: (...args: unknown[]) => calls.push({ method: 'save', args }),
    restore: (...args: unknown[]) => calls.push({ method: 'restore', args }),
    clearRect: (...args: unknown[]) => calls.push({ method: 'clearRect', args }),
    drawImage: (...args: unknown[]) => calls.push({ method: 'drawImage', args }),
    set filter(v: string) {
      lastFilter = v
      calls.push({ method: 'set:filter', args: [v] })
    },
    get filter() {
      return lastFilter
    },
  } as unknown as CanvasRenderingContext2D
  HTMLCanvasElement.prototype.getContext = function getContext(): CanvasRenderingContext2D | null {
    return ctx
  } as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = function toDataURL(): string {
    return 'data:image/png;base64,STUB'
  }
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()
  HTMLCanvasElement.prototype.hasPointerCapture = vi.fn(() => true)
  return { ctx, calls }
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('clamps below the minimum', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
  })
  it('clamps above the maximum', () => {
    expect(clamp(2, 0, 1)).toBe(1)
  })
  it('returns min for non-finite input', () => {
    expect(clamp(NaN, 0, 1)).toBe(0)
    expect(clamp(Infinity, 5, 10)).toBe(5)
  })
})

describe('composeFilterString', () => {
  it('returns "none" when filters are undefined or empty', () => {
    expect(composeFilterString(undefined)).toBe('none')
    expect(composeFilterString({})).toBe('none')
  })

  it('omits identity values', () => {
    expect(composeFilterString({ brightness: 1, contrast: 1, saturation: 1 })).toBe('none')
  })

  it('emits brightness/contrast/saturate in that order when set', () => {
    expect(composeFilterString({ brightness: 1.2, contrast: 1.1, saturation: 0.9 })).toBe(
      'brightness(1.2) contrast(1.1) saturate(0.9)',
    )
  })

  it('clamps brightness/contrast/saturation at zero', () => {
    expect(composeFilterString({ brightness: -1 })).toBe('brightness(0)')
    expect(composeFilterString({ contrast: -2 })).toBe('contrast(0)')
    expect(composeFilterString({ saturation: -0.5 })).toBe('saturate(0)')
  })

  it('normalises hue modulo 360', () => {
    expect(composeFilterString({ hue: 90 })).toBe('hue-rotate(90deg)')
    expect(composeFilterString({ hue: -30 })).toBe('hue-rotate(330deg)')
    expect(composeFilterString({ hue: 720 })).toBe('none')
  })

  it('clamps sepia and grayscale into [0, 1]', () => {
    expect(composeFilterString({ sepia: 0.5 })).toBe('sepia(0.5)')
    expect(composeFilterString({ sepia: 2 })).toBe('sepia(1)')
    expect(composeFilterString({ sepia: -1 })).toBe('none')
    expect(composeFilterString({ grayscale: 0.25 })).toBe('grayscale(0.25)')
    expect(composeFilterString({ grayscale: 9 })).toBe('grayscale(1)')
  })

  it('emits blur in pixels and clamps below zero', () => {
    expect(composeFilterString({ blur: 4 })).toBe('blur(4px)')
    expect(composeFilterString({ blur: -3 })).toBe('none')
  })

  it('approximates sharpen as a contrast bump', () => {
    expect(composeFilterString({ sharpen: 0 })).toBe('none')
    expect(composeFilterString({ sharpen: 1 })).toBe('contrast(1.5)')
    expect(composeFilterString({ sharpen: 0.5 })).toBe('contrast(1.25)')
    expect(composeFilterString({ sharpen: 5 })).toBe('contrast(1.5)')
  })

  it('chains filters in the documented order', () => {
    expect(
      composeFilterString({
        brightness: 1.2,
        contrast: 1.1,
        saturation: 1.3,
        hue: 45,
        sepia: 0.2,
        grayscale: 0.1,
        blur: 2,
        sharpen: 0.5,
      }),
    ).toBe(
      'brightness(1.2) contrast(1.1) saturate(1.3) hue-rotate(45deg) sepia(0.2) grayscale(0.1) blur(2px) contrast(1.25)',
    )
  })

  it('skips non-finite filter values', () => {
    expect(composeFilterString({ brightness: NaN, contrast: Infinity })).toBe('none')
  })
})

describe('screenToCanvas', () => {
  it('maps the canvas centre to the image centre when pan/zoom are identity', () => {
    expect(
      screenToCanvas(
        { x: 100, y: 100 },
        { width: 200, height: 200 },
        { width: 400, height: 400 },
        1,
        { x: 0, y: 0 },
      ),
    ).toEqual({ x: 200, y: 200 })
  })

  it('inverts zoom — a zoomed-in canvas maps screen pixels to fewer image pixels', () => {
    expect(
      screenToCanvas(
        { x: 200, y: 200 },
        { width: 200, height: 200 },
        { width: 400, height: 400 },
        2,
        { x: 0, y: 0 },
      ),
    ).toEqual({ x: 250, y: 250 })
  })

  it('inverts pan offsets', () => {
    expect(
      screenToCanvas(
        { x: 100, y: 100 },
        { width: 200, height: 200 },
        { width: 400, height: 400 },
        1,
        { x: 50, y: 50 },
      ),
    ).toEqual({ x: 150, y: 150 })
  })

  it('falls back to zoom=1 when zoom is non-positive or non-finite', () => {
    expect(
      screenToCanvas(
        { x: 100, y: 100 },
        { width: 200, height: 200 },
        { width: 400, height: 400 },
        0,
        { x: 0, y: 0 },
      ),
    ).toEqual({ x: 200, y: 200 })
    expect(
      screenToCanvas(
        { x: 100, y: 100 },
        { width: 200, height: 200 },
        { width: 400, height: 400 },
        NaN,
        { x: 0, y: 0 },
      ),
    ).toEqual({ x: 200, y: 200 })
  })
})

describe('clampPan', () => {
  it('returns the input pan when it is well within bounds', () => {
    expect(
      clampPan({ x: 10, y: 20 }, { width: 400, height: 400 }, { width: 200, height: 200 }, 1),
    ).toEqual({ x: 10, y: 20 })
  })

  it('clamps pan to keep half the image visible', () => {
    // canvas 400, image 200, zoom 1 → halfImg = 100, halfImg/2 = 50, halfCanvas = 200
    // → max = 200 + 50 = 250
    const out = clampPan(
      { x: 9999, y: -9999 },
      { width: 400, height: 400 },
      { width: 200, height: 200 },
      1,
    )
    expect(out).toEqual({ x: 250, y: -250 })
  })

  it('honors zoom when computing the bound', () => {
    // canvas 400, image 200, zoom 2 → halfImg = 200, halfImg/2 = 100, halfCanvas = 200
    // → max = 300
    const out = clampPan(
      { x: 9999, y: 0 },
      { width: 400, height: 400 },
      { width: 200, height: 200 },
      2,
    )
    expect(out.x).toBe(300)
  })

  it('treats non-finite pan as zero', () => {
    expect(
      clampPan(
        { x: NaN, y: Infinity },
        { width: 400, height: 400 },
        { width: 200, height: 200 },
        1,
      ),
    ).toEqual({ x: 0, y: 0 })
  })
})

describe('<ImageCanvas>', () => {
  it('renders a canvas at the requested size with i18n aria labels', () => {
    stubCanvasContext()
    const { container, getByRole } = render(
      <Wrap>
        <ImageCanvas src="data:image/png;base64,STUB" width={320} height={240} />
      </Wrap>,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-label')).toBe('Image canvas')
    const canvas = container.querySelector(
      '[data-mol-id="image-canvas-surface"]',
    ) as HTMLCanvasElement
    expect(canvas).toBeTruthy()
    expect(canvas.getAttribute('width')).toBe('320')
    expect(canvas.getAttribute('height')).toBe('240')
    expect(canvas.getAttribute('aria-label')).toBe('Drag to pan, scroll to zoom')
  })

  it('shows the loading message until an image is provided', () => {
    stubCanvasContext()
    const { container } = render(
      <Wrap>
        <ImageCanvas src="data:image/png;base64,STUB" />
      </Wrap>,
    )
    const loading = container.querySelector('[data-mol-id="image-canvas-loading"]')
    expect(loading?.textContent).toContain('Loading')
  })

  it('renders without a loading state when given a pre-loaded HTMLImageElement', () => {
    stubCanvasContext()
    const img = new Image()
    Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true })
    const { container } = render(
      <Wrap>
        <ImageCanvas src={img} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="image-canvas-loading"]')).toBeNull()
  })

  it('paints with the composed filter string when an image is loaded', () => {
    const recorder = stubCanvasContext()
    const img = new Image()
    Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true })
    render(
      <Wrap>
        <ImageCanvas src={img} filters={{ brightness: 1.2, sepia: 0.4 }} />
      </Wrap>,
    )
    const filterCalls = recorder.calls.filter((c) => c.method === 'set:filter')
    expect(filterCalls.length).toBeGreaterThan(0)
    expect(filterCalls.at(-1)?.args[0]).toBe('brightness(1.2) sepia(0.4)')
  })

  it('exposes toDataURL via exportRef', () => {
    stubCanvasContext()
    const img = new Image()
    Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true })
    const exportRef = React.createRef<{ toDataURL: (t?: string, q?: number) => string }>()
    render(
      <Wrap>
        <ImageCanvas src={img} exportRef={exportRef} />
      </Wrap>,
    )
    expect(exportRef.current).toBeTruthy()
    expect(exportRef.current?.toDataURL()).toBe('data:image/png;base64,STUB')
  })

  it('does not crash when getContext returns null', () => {
    HTMLCanvasElement.prototype.getContext =
      function getContext(): CanvasRenderingContext2D | null {
        return null
      } as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()
    HTMLCanvasElement.prototype.hasPointerCapture = vi.fn(() => false)
    expect(() =>
      render(
        <Wrap>
          <ImageCanvas src="data:image/png;base64,STUB" />
        </Wrap>,
      ),
    ).not.toThrow()
  })
})
