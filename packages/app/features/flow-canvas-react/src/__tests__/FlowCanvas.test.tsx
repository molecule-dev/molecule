// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { FlowCanvas } from '../FlowCanvas.js'
import type { FlowChange, FlowEdge, FlowNode } from '../types.js'

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
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // jsdom 27 ships getBoundingClientRect; pointer-capture stubs are added
  // per-test where needed.
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
})

const node = (id: string, x: number, y: number): FlowNode => ({
  id,
  type: 'task',
  position: { x, y },
  data: { label: id.toUpperCase() },
})

describe('<FlowCanvas>', () => {
  it('renders a labelled application root', () => {
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={[]} edges={[]} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="flow-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
  })

  it('renders one absolutely-positioned div per node', () => {
    const nodes = [node('a', 10, 20), node('b', 200, 100)]
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={nodes} edges={[]} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="flow-canvas-node-a"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="flow-canvas-node-b"]')).not.toBeNull()
    const a = container.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
    expect(a.style.transform).toContain('translate(10px, 20px)')
  })

  it('renders an SVG path per edge', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={nodes} edges={edges} />
      </Wrap>,
    )
    const path = container.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('d')).toMatch(/^M /)
  })

  it('passes node data to nodeRenderers when type matches', () => {
    const nodes = [node('a', 0, 0)]
    const { container } = render(
      <Wrap>
        <FlowCanvas
          nodes={nodes}
          edges={[]}
          nodeRenderers={{
            task: (n) => <span data-test="label">{(n.data as { label: string }).label}</span>,
          }}
        />
      </Wrap>,
    )
    const label = container.querySelector('[data-test="label"]')
    expect(label?.textContent).toBe('A')
  })

  it('uses children as a fallback renderer', () => {
    const nodes = [node('a', 0, 0)]
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={nodes} edges={[]}>
          <span data-test="fallback">fallback</span>
        </FlowCanvas>
      </Wrap>,
    )
    expect(container.querySelector('[data-test="fallback"]')).not.toBeNull()
  })

  it('selects an edge on click and surfaces it via onSelectionChange', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onSelectionChange = vi.fn()
    const onEdgeClick = vi.fn()
    const { container } = render(
      <Wrap>
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onSelectionChange={onSelectionChange}
          onEdgeClick={onEdgeClick}
        />
      </Wrap>,
    )
    const hit = container.querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
    fireEvent.click(hit)
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: [], edgeIds: ['e1'] })
    expect(onEdgeClick).toHaveBeenCalledTimes(1)
    expect(onEdgeClick.mock.calls[0][0]).toMatchObject({ id: 'e1' })
    // Selected edge is rendered with a higher stroke-width.
    const path = container.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path?.getAttribute('data-selected')).toBe('true')
  })

  it('removes selected edge on Backspace (controlled mode)', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onChange = vi.fn<(c: FlowChange) => void>()
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={nodes} edges={edges} onChange={onChange} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].edges).toEqual([])
    expect(onChange.mock.calls[0][0].nodes).toEqual(nodes)
  })

  it('removes selected node and its edges on Delete (uncontrolled mode)', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={nodes} edges={edges} />
      </Wrap>,
    )
    // Click a node body to select it.
    const nodeA = container.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    fireEvent.pointerDown(nodeA, { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(nodeA, { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.keyDown(window, { key: 'Delete' })
    // Re-query: node + its edges must be gone.
    expect(container.querySelector('[data-mol-id="flow-canvas-node-a"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="flow-canvas-edge-e1"]')).toBeNull()
  })

  it('drag-translates a node and emits a single onChange per pointermove (controlled)', () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(c: FlowChange) => void>()
    // Make getBoundingClientRect return a fixed origin so clientToWorld math is stable.
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
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
          <FlowCanvas nodes={nodes} edges={[]} onChange={onChange} />
        </Wrap>,
      )
      const nodeA = container.querySelector('[data-mol-id="flow-canvas-node-a"]')!
      fireEvent.pointerDown(nodeA, { button: 0, pointerId: 1, clientX: 50, clientY: 50 })
      fireEvent.pointerMove(nodeA, { pointerId: 1, clientX: 70, clientY: 60 })
      fireEvent.pointerUp(nodeA, { pointerId: 1, clientX: 70, clientY: 60 })
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(last.nodes[0].position).toEqual({ x: 20, y: 10 })
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('controlled vs uncontrolled: uncontrolled drag updates DOM without onChange', () => {
    const nodes = [node('a', 0, 0)]
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
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
          <FlowCanvas nodes={nodes} edges={[]} />
        </Wrap>,
      )
      const nodeA = container.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
      fireEvent.pointerDown(nodeA, { button: 0, pointerId: 1, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(nodeA, { pointerId: 1, clientX: 25, clientY: 15 })
      fireEvent.pointerUp(nodeA, { pointerId: 1, clientX: 25, clientY: 15 })
      const updated = container.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
      expect(updated.style.transform).toContain('translate(25px, 15px)')
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('draws an edge between nodes when the source handle is dragged onto a target', () => {
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(c: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
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
          <FlowCanvas nodes={nodes} edges={[]} onChange={onChange} />
        </Wrap>,
      )
      const handleA = container.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = container.querySelector('[data-mol-id="flow-canvas-node-b"]')!
      fireEvent.pointerDown(handleA, { button: 0, pointerId: 1, clientX: 180, clientY: 40 })
      fireEvent.pointerUp(nodeB, { button: 0, pointerId: 1, clientX: 320, clientY: 40 })
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(last.edges).toHaveLength(1)
      expect(last.edges[0]).toMatchObject({ source: 'a', target: 'b' })
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('does NOT create a self-loop when handle is released over the same node', () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(c: FlowChange) => void>()
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={nodes} edges={[]} onChange={onChange} />
      </Wrap>,
    )
    const handleA = container.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
    const nodeA = container.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    fireEvent.pointerDown(handleA, { button: 0, pointerId: 1, clientX: 180, clientY: 40 })
    fireEvent.pointerUp(nodeA, { button: 0, pointerId: 1, clientX: 100, clientY: 40 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hides the grid when showGrid={false}', () => {
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={[]} edges={[]} showGrid={false} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="flow-canvas-grid"]')).toBeNull()
  })
})
