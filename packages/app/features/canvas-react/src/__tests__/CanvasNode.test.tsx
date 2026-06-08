// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { CanvasNode } from '../CanvasNode.js'
import type { CanvasDragInfo, CanvasResizeInfo } from '../types.js'

/**
 * Builds a stub UIClassMap where every class accessor returns the property name as a string.
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
 * Wraps children with I18nProvider using a simple English i18n provider.
 * @param root0
 * @param root0.children
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<CanvasNode>', () => {
  it('positions the wrapper at canvas-space coords', () => {
    const { container } = render(
      <Wrap>
        <CanvasNode id="a" position={{ x: 100, y: 50 }} />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    expect(node.style.left).toBe('100px')
    expect(node.style.top).toBe('50px')
  })

  it('marks selected via aria-selected + data-selected', () => {
    const { container } = render(
      <Wrap>
        <CanvasNode id="a" position={{ x: 0, y: 0 }} selected />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="canvas-node-a"]')!
    expect(node.getAttribute('aria-selected')).toBe('true')
    expect(node.getAttribute('data-selected')).toBe('true')
  })

  it('fires onSelect on pointer-down → pointer-up without movement', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <Wrap>
        <CanvasNode id="a" position={{ x: 0, y: 0 }} onSelect={onSelect} />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    fireEvent.pointerDown(node, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerUp(node, { pointerId: 1, clientX: 10, clientY: 10 })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toBe('a')
  })

  it('drags fire onDrag with canvas-space deltas (no surface zoom = 1)', () => {
    const onDrag = vi.fn<(info: CanvasDragInfo) => void>()
    const onSelect = vi.fn()
    const { container } = render(
      <Wrap>
        <CanvasNode id="a" position={{ x: 0, y: 0 }} onDrag={onDrag} onSelect={onSelect} />
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    fireEvent.pointerDown(node, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 0,
      clientY: 0,
    })
    fireEvent.pointerMove(node, { pointerId: 1, clientX: 30, clientY: 40 })
    fireEvent.pointerUp(node, { pointerId: 1, clientX: 30, clientY: 40 })
    // First drag tick has start=true.
    expect(onDrag).toHaveBeenCalled()
    const first = onDrag.mock.calls[0][0]
    expect(first.start).toBe(true)
    expect(first.delta).toEqual({ x: 30, y: 40 })
    expect(first.position).toEqual({ x: 30, y: 40 })
    // Last call is the end signal.
    const last = onDrag.mock.calls[onDrag.mock.calls.length - 1][0]
    expect(last.end).toBe(true)
    // onSelect should NOT have fired because the gesture moved.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reads zoom from ancestor with data-canvas-zoom and divides delta by it', () => {
    const onDrag = vi.fn<(info: CanvasDragInfo) => void>()
    const { container } = render(
      <Wrap>
        <div data-canvas-zoom="2">
          <CanvasNode id="a" position={{ x: 0, y: 0 }} onDrag={onDrag} />
        </div>
      </Wrap>,
    )
    const node = container.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    fireEvent.pointerDown(node, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 0,
      clientY: 0,
    })
    fireEvent.pointerMove(node, { pointerId: 1, clientX: 100, clientY: 60 })
    fireEvent.pointerUp(node, { pointerId: 1, clientX: 100, clientY: 60 })
    const first = onDrag.mock.calls[0][0]
    // At zoom 2, screen 100/60 → canvas 50/30.
    expect(first.delta).toEqual({ x: 50, y: 30 })
  })

  it('renders a resize handle when onResize is supplied AND size is set', () => {
    const onResize = vi.fn<(info: CanvasResizeInfo) => void>()
    const { container } = render(
      <Wrap>
        <CanvasNode
          id="a"
          position={{ x: 0, y: 0 }}
          size={{ width: 80, height: 40 }}
          onResize={onResize}
        />
      </Wrap>,
    )
    const handle = container.querySelector('[data-mol-id="canvas-node-resize-handle-a"]')
    expect(handle).not.toBeNull()
  })

  it('resize gestures fire onResize with canvas-space deltas', () => {
    const onResize = vi.fn<(info: CanvasResizeInfo) => void>()
    const { container } = render(
      <Wrap>
        <CanvasNode
          id="a"
          position={{ x: 10, y: 20 }}
          size={{ width: 80, height: 40 }}
          onResize={onResize}
        />
      </Wrap>,
    )
    const handle = container.querySelector(
      '[data-mol-id="canvas-node-resize-handle-a"]',
    ) as HTMLElement
    fireEvent.pointerDown(handle, {
      pointerId: 2,
      button: 0,
      pointerType: 'mouse',
      clientX: 0,
      clientY: 0,
    })
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 20, clientY: 10 })
    fireEvent.pointerUp(handle, { pointerId: 2, clientX: 20, clientY: 10 })
    expect(onResize).toHaveBeenCalled()
    const first = onResize.mock.calls[0][0]
    expect(first.size.width).toBe(100)
    expect(first.size.height).toBe(50)
    expect(first.position).toEqual({ x: 10, y: 20 })
  })
})
