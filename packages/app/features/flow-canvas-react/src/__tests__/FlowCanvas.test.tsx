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
      const fn = (..._args: unknown[]): string => token
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
  it('renders a labelled application root without a tab stop', () => {
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={[]} edges={[]} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="flow-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    // The canvas root is not a tab stop: keyboard interaction lives on the
    // nodes' select buttons, not on the non-interactive application root.
    expect(root?.getAttribute('tabindex')).toBeNull()
  })

  it('names each node select button by its content and selects on keyboard activation', () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const { container } = render(
      <Wrap>
        <FlowCanvas
          nodes={[node('a', 0, 0)]}
          edges={[]}
          nodeRenderers={{
            task: (n) => <span>{(n.data as { label: string }).label}</span>,
          }}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
        />
      </Wrap>,
    )
    const selectButton = container.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    expect(selectButton).not.toBeNull()
    expect(selectButton.type).toBe('button')
    // The button sits beneath the content (a sibling, never a wrapper) and is
    // named by it.
    expect(selectButton.textContent).toBe('')
    const content = document.getElementById(selectButton.getAttribute('aria-labelledby') as string)
    expect(content?.textContent).toBe('A')
    expect(selectButton.contains(content)).toBe(false)
    // Browsers synthesize a click with `detail === 0` when Enter / Space
    // activates a focused button — that is the keyboard path.
    fireEvent.click(selectButton, { detail: 0 })
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: ['a'], edgeIds: [] })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('names a node with an ariaLabel by it', () => {
    const { container } = render(
      <Wrap>
        <FlowCanvas
          nodes={[{ ...node('a', 0, 0), ariaLabel: 'Start step' }]}
          edges={[]}
          nodeRenderers={{
            task: (n) => <span>{(n.data as { label: string }).label}</span>,
          }}
        />
      </Wrap>,
    )
    const selectButton = container.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    // The node's own name wins over naming the button by its content.
    expect(selectButton.getAttribute('aria-label')).toBe('Start step')
    expect(selectButton.getAttribute('aria-labelledby')).toBeNull()
  })

  it('names a node with no renderer and no children by its number', () => {
    const { container } = render(
      <Wrap>
        <FlowCanvas nodes={[node('a', 0, 0), node('b', 200, 0)]} edges={[]} />
      </Wrap>,
    )
    // An empty node still needs an operable select button: the canvas names
    // it after the node's position, one-based.
    const a = container.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const b = container.querySelector('button[data-mol-id="flow-canvas-node-select-b"]')!
    expect(a.getAttribute('aria-label')).toBe('Node 1')
    expect(b.getAttribute('aria-label')).toBe('Node 2')
    expect(a.getAttribute('aria-labelledby')).toBeNull()
    expect(b.getAttribute('aria-labelledby')).toBeNull()
  })

  it('keeps the controls a renderer draws outside the select button', () => {
    const { container } = render(
      <Wrap>
        <FlowCanvas
          nodes={[node('a', 0, 0)]}
          edges={[]}
          nodeRenderers={{ task: () => <input aria-label="Step name" /> }}
        />
      </Wrap>,
    )
    const selectButton = container.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const input = container.querySelector('input[aria-label="Step name"]')!
    expect(input).not.toBeNull()
    expect(selectButton.contains(input)).toBe(false)
    expect(input.closest('button')).toBeNull()
  })

  it('does not double-notify when a pointer click passes through the select button', () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const { container } = render(
      <Wrap>
        <FlowCanvas
          nodes={[node('a', 0, 0)]}
          edges={[]}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
        />
      </Wrap>,
    )
    const selectButton = container.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    // Pointer path: pointerdown selects (bubbling to the node group);
    // the resulting click has detail > 0 and must NOT select again.
    fireEvent.pointerDown(selectButton, { button: 0, pointerId: 1, clientX: 5, clientY: 5 })
    fireEvent.click(selectButton, { detail: 1 })
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onNodeClick).toHaveBeenCalledTimes(1)
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
