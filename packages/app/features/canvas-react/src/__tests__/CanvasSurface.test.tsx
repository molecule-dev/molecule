// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { CanvasSurface } from '../CanvasSurface.js'
import type { CanvasViewport } from '../types.js'

/** Build a UIClassMap stub via Proxy. */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_tt, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wraps children with the I18nProvider required by CanvasSurface.
 * @param root0
 * @param root0.children
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<CanvasSurface>', () => {
  it('renders a labelled root with role="application"', () => {
    const { container } = render(
      <Wrap>
        <CanvasSurface width={400} height={300} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="canvas-surface"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
  })

  it('exposes viewport state on the inner layer via data attrs', () => {
    const { container } = render(
      <Wrap>
        <CanvasSurface
          viewport={{ x: 10, y: 20, zoom: 2 }}
          onViewportChange={() => {}}
          width={400}
          height={300}
        />
      </Wrap>,
    )
    const inner = container.querySelector('[data-mol-id="canvas-surface-inner"]')!
    expect(inner.getAttribute('data-canvas-zoom')).toBe('2')
    expect(inner.getAttribute('data-canvas-x')).toBe('10')
    expect(inner.getAttribute('data-canvas-y')).toBe('20')
  })

  it('zooms on wheel and keeps the focal point fixed', () => {
    const onChange = vi.fn<(v: CanvasViewport) => void>()
    /**
     * Controlled host component for testing zoom/wheel interactions.
     */
    function Host(): React.ReactElement {
      const [vp, setVp] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 })
      return (
        <CanvasSurface
          viewport={vp}
          onViewportChange={(next) => {
            onChange(next)
            setVp(next)
          }}
          width={400}
          height={300}
        />
      )
    }
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
      const { container } = render(
        <Wrap>
          <Host />
        </Wrap>,
      )
      const root = container.querySelector('[data-mol-id="canvas-surface"]') as HTMLElement
      // Wheel up at (100, 100) — zoom in.
      fireEvent.wheel(root, { deltaY: -100, clientX: 100, clientY: 100 })
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
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
    const onChange = vi.fn<(v: CanvasViewport) => void>()
    /**
     * Controlled host component for testing pan/drag interactions.
     */
    function Host(): React.ReactElement {
      const [vp, setVp] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 })
      return (
        <CanvasSurface
          viewport={vp}
          onViewportChange={(next) => {
            onChange(next)
            setVp(next)
          }}
          width={400}
          height={300}
        />
      )
    }
    const { container } = render(
      <Wrap>
        <Host />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="canvas-surface"]') as HTMLElement
    fireEvent.pointerDown(root, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 110, clientY: 120 })
    fireEvent.pointerUp(root, { pointerId: 1, clientX: 110, clientY: 120 })
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    // Drag right+down by (10, 20) at zoom 1 → viewport origin moves left+up.
    expect(last.x).toBeCloseTo(-10, 6)
    expect(last.y).toBeCloseTo(-20, 6)
  })

  it('fires onBackgroundPointerDown for empty-area clicks', () => {
    const onBg = vi.fn()
    const { container } = render(
      <Wrap>
        <CanvasSurface width={400} height={300} onBackgroundPointerDown={onBg} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="canvas-surface"]')!
    fireEvent.pointerDown(root, { pointerId: 1, button: 0, pointerType: 'mouse' })
    expect(onBg).toHaveBeenCalledTimes(1)
  })
})
