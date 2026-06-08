// @vitest-environment jsdom

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { buildEdgePath, CanvasEdge } from '../CanvasEdge.js'

/**
 * Builds a stub UIClassMap that returns each token as its own class name string.
 */
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
 * Wraps children in an I18nProvider for test rendering.
 * @param root0
 * @param root0.children
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
  it('renders an SVG with the canvas-edge data-mol-id', () => {
    const { container } = render(
      <Wrap>
        <CanvasEdge from={{ x: 0, y: 0 }} to={{ x: 100, y: 100 }} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="canvas-edge"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="canvas-edge-path"]')).not.toBeNull()
  })

  it('exposes the edge kind on a data attr', () => {
    const { container } = render(
      <Wrap>
        <CanvasEdge from={{ x: 0, y: 0 }} to={{ x: 100, y: 100 }} kind="bezier" />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="canvas-edge"]')!
    expect(svg.getAttribute('data-edge-kind')).toBe('bezier')
  })

  it('positions the SVG to span the endpoint bounding box (with margin)', () => {
    const { container } = render(
      <Wrap>
        <CanvasEdge from={{ x: 50, y: 60 }} to={{ x: 150, y: 110 }} />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="canvas-edge"]') as SVGElement
    const left = (svg as unknown as HTMLElement).style.left
    const top = (svg as unknown as HTMLElement).style.top
    // margin defaults to max(20, 8) = 20 → svg origin = (30, 40).
    expect(left).toBe('30px')
    expect(top).toBe('40px')
  })
})
