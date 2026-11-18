// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `FlowCanvas` — a port of
 * `@molecule/app-flow-canvas-react/src/__tests__/FlowCanvas.test.tsx`: the
 * same behavioral assertions, rendered with a real mount (jsdom), the bonded
 * ClassMap and the bonded i18n provider.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FlowCanvas from '../FlowCanvas.svelte'
import type { FlowChange, FlowEdge, FlowNode } from '../types.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

beforeEach(() => {
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
})

/** A snippet that renders fixed markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders a `FlowCanvas` and returns the element it mounted into. */
const render = (props: Record<string, unknown>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(FlowCanvas, { target, props }))
  flushSync()
  return target
}

/** Dispatches a real pointer event, as a browser does. */
const pointer = (el: Element, type: string, clientX = 0, clientY = 0): void => {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointermove' ? 1 : 0,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    }),
  )
  flushSync()
}

/** Dispatches a click with an explicit `detail` (0 is keyboard activation). */
const clickWithDetail = (el: Element, detail: number): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
  flushSync()
}

const node = (id: string, x: number, y: number): FlowNode => ({
  id,
  type: 'task',
  position: { x, y },
  data: { label: id.toUpperCase() },
})

/** `getBoundingClientRect` returning a fixed origin, for the drag maths. */
const fixedRect = (): DOMRect =>
  ({
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
  }) as DOMRect

describe('<FlowCanvas>', () => {
  it('renders a labelled application root without a tab stop', () => {
    const target = render({ nodes: [], edges: [] })
    const root = target.querySelector('[data-mol-id="flow-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    expect(root?.getAttribute('tabindex')).toBeNull()
  })

  it('names each node select button by its content and selects on keyboard activation', () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const label = createRawSnippet<[FlowNode]>((n) => ({
      render: () => `<span>${(n().data as { label: string }).label}</span>`,
    }))
    const target = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      nodeRenderers: { task: label },
      onSelectionChange,
      onNodeClick,
    })
    const selectButton = target.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    expect(selectButton).not.toBeNull()
    expect(selectButton.type).toBe('button')
    expect(selectButton.textContent).toBe('')
    const content = target.querySelector(`[id="${selectButton.getAttribute('aria-labelledby')}"]`)
    expect(content?.textContent).toBe('A')
    expect(selectButton.contains(content)).toBe(false)
    clickWithDetail(selectButton, 0)
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: ['a'], edgeIds: [] })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('names a node with an ariaLabel by it', () => {
    const label = createRawSnippet<[FlowNode]>((n) => ({
      render: () => `<span>${(n().data as { label: string }).label}</span>`,
    }))
    const target = render({
      nodes: [{ ...node('a', 0, 0), ariaLabel: 'Start step' }],
      edges: [],
      nodeRenderers: { task: label },
    })
    const selectButton = target.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    // The node's own name wins over naming the button by its content.
    expect(selectButton.getAttribute('aria-label')).toBe('Start step')
    expect(selectButton.getAttribute('aria-labelledby')).toBeNull()
  })

  it('names a node with no renderer and no children by its number', () => {
    const target = render({ nodes: [node('a', 0, 0), node('b', 200, 0)], edges: [] })
    // An empty node still needs an operable select button: the canvas names
    // it after the node's position, one-based.
    const a = target.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const b = target.querySelector('button[data-mol-id="flow-canvas-node-select-b"]')!
    expect(a.getAttribute('aria-label')).toBe('Node 1')
    expect(b.getAttribute('aria-label')).toBe('Node 2')
    expect(a.getAttribute('aria-labelledby')).toBeNull()
    expect(b.getAttribute('aria-labelledby')).toBeNull()
  })

  it('keeps the controls a renderer draws outside the select button', () => {
    const target = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      nodeRenderers: { task: raw('<input aria-label="Step name">') },
    })
    const selectButton = target.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const input = target.querySelector('input[aria-label="Step name"]')!
    expect(input).not.toBeNull()
    expect(selectButton.contains(input)).toBe(false)
    expect(input.closest('button')).toBeNull()
  })

  it('does not double-notify when a pointer click passes through the select button', () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const target = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      onSelectionChange,
      onNodeClick,
    })
    const selectButton = target.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    pointer(selectButton, 'pointerdown', 5, 5)
    clickWithDetail(selectButton, 1)
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('renders one absolutely-positioned div per node', () => {
    const nodes = [node('a', 10, 20), node('b', 200, 100)]
    const target = render({ nodes, edges: [] })
    expect(target.querySelector('[data-mol-id="flow-canvas-node-a"]')).not.toBeNull()
    expect(target.querySelector('[data-mol-id="flow-canvas-node-b"]')).not.toBeNull()
    const a = target.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
    expect(a.style.transform).toContain('translate(10px, 20px)')
  })

  it('renders an SVG path per edge', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const target = render({ nodes, edges })
    const path = target.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('d')).toMatch(/^M /)
  })

  it('passes node data to nodeRenderers when type matches', () => {
    const label = createRawSnippet<[FlowNode]>((n) => ({
      render: () => `<span data-test="label">${(n().data as { label: string }).label}</span>`,
    }))
    const target = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      nodeRenderers: { task: label },
    })
    expect(target.querySelector('[data-test="label"]')?.textContent).toBe('A')
  })

  it('uses children as a fallback renderer', () => {
    const target = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      children: raw('<span data-test="fallback">fallback</span>'),
    })
    expect(target.querySelector('[data-test="fallback"]')).not.toBeNull()
  })

  it('selects an edge on click and surfaces it via onSelectionChange', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onSelectionChange = vi.fn()
    const onEdgeClick = vi.fn()
    const target = render({ nodes, edges, onSelectionChange, onEdgeClick })
    const hit = target.querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: [], edgeIds: ['e1'] })
    expect(onEdgeClick).toHaveBeenCalledTimes(1)
    expect(onEdgeClick.mock.calls[0]![0]).toMatchObject({ id: 'e1' })
    const path = target.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path?.getAttribute('data-selected')).toBe('true')
  })

  it('removes selected edge on Backspace (controlled mode)', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const target = render({ nodes, edges, onChange })
    target
      .querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    flushSync()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0].edges).toEqual([])
    expect(onChange.mock.calls[0]![0].nodes).toEqual(nodes)
  })

  it('removes selected node and its edges on Delete (uncontrolled mode)', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const target = render({ nodes, edges })
    const nodeA = target.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    pointer(nodeA, 'pointerdown', 10, 10)
    pointer(nodeA, 'pointerup', 10, 10)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    flushSync()
    expect(target.querySelector('[data-mol-id="flow-canvas-node-a"]')).toBeNull()
    expect(target.querySelector('[data-mol-id="flow-canvas-edge-e1"]')).toBeNull()
  })

  it('drag-translates a node and emits a single onChange per pointermove (controlled)', () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const target = render({ nodes, edges: [], onChange })
      const nodeA = target.querySelector('[data-mol-id="flow-canvas-node-a"]')!
      pointer(nodeA, 'pointerdown', 50, 50)
      pointer(nodeA, 'pointermove', 70, 60)
      pointer(nodeA, 'pointerup', 70, 60)
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
      expect(last.nodes[0]!.position).toEqual({ x: 20, y: 10 })
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('controlled vs uncontrolled: uncontrolled drag updates DOM without onChange', () => {
    const nodes = [node('a', 0, 0)]
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const target = render({ nodes, edges: [] })
      const nodeA = target.querySelector('[data-mol-id="flow-canvas-node-a"]')!
      pointer(nodeA, 'pointerdown', 0, 0)
      pointer(nodeA, 'pointermove', 25, 15)
      pointer(nodeA, 'pointerup', 25, 15)
      const updated = target.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
      expect(updated.style.transform).toContain('translate(25px, 15px)')
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('draws an edge between nodes when the source handle is dragged onto a target', () => {
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const target = render({ nodes, edges: [], onChange })
      const handleA = target.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = target.querySelector('[data-mol-id="flow-canvas-node-b"]')!
      pointer(handleA, 'pointerdown', 180, 40)
      pointer(nodeB, 'pointerup', 320, 40)
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
      expect(last.edges).toHaveLength(1)
      expect(last.edges[0]).toMatchObject({ source: 'a', target: 'b' })
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('gives two edges drawn in the same millisecond distinct ids', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const target = render({ nodes, edges: [], onChange })
      const handleA = target.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = target.querySelector('[data-mol-id="flow-canvas-node-b"]')!

      pointer(handleA, 'pointerdown', 180, 40)
      pointer(nodeB, 'pointerup', 320, 40)
      pointer(handleA, 'pointerdown', 180, 40)
      pointer(nodeB, 'pointerup', 320, 40)

      expect(onChange).toHaveBeenCalledTimes(2)
      const ids = onChange.mock.calls.map(([change]) => change.edges[0]!.id)
      expect(new Set(ids).size).toBe(2)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
      now.mockRestore()
    }
  })

  it('does NOT create a self-loop when handle is released over the same node', () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const target = render({ nodes, edges: [], onChange })
    const handleA = target.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
    const nodeA = target.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    pointer(handleA, 'pointerdown', 180, 40)
    pointer(nodeA, 'pointerup', 100, 40)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hides the grid when showGrid={false}', () => {
    const target = render({ nodes: [], edges: [], showGrid: false })
    expect(target.querySelector('[data-mol-id="flow-canvas-grid"]')).toBeNull()
  })
})
