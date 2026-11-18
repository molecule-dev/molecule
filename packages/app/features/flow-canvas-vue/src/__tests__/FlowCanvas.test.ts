// @vitest-environment jsdom
/**
 * Unit tests for the Vue `FlowCanvas` — a port of
 * `@molecule/app-flow-canvas-react/src/__tests__/FlowCanvas.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default, with `{{key}}` placeholders
// interpolated from the values (as the real simple provider does).
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values?: Record<string, unknown> | null,
      opts?: { defaultValue?: string },
    ) => {
      const text = opts?.defaultValue ?? _key
      if (!values) return text
      return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
        values[name] === undefined ? match : String(values[name]),
      )
    },
  }),
}))

import { type App, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { FlowCanvas } from '../FlowCanvas.js'
import type { FlowCanvasProps, FlowChange, FlowEdge, FlowNode } from '../types.js'

/** The apps mounted during one test, unmounted afterwards. */
const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
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

/** Renders a {@link FlowCanvas} and returns the element it mounted into. */
const render = (
  props: FlowCanvasProps,
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(FlowCanvas, props, slots) }))
  app.mount(host)
  apps.push(app)
  return host
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
}

/** Dispatches a click with an explicit `detail` (0 is keyboard activation). */
const clickWithDetail = (el: Element, detail: number): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
}

const node = (id: string, x: number, y: number): FlowNode => ({
  id,
  type: 'task',
  position: { x, y },
  data: { label: id.toUpperCase() },
})

describe('<FlowCanvas>', () => {
  it('renders a labelled application root without a tab stop', () => {
    const host = render({ nodes: [], edges: [] })
    const root = host.querySelector('[data-mol-id="flow-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    // The canvas root is not a tab stop: keyboard interaction lives on the
    // nodes' select buttons, not on the non-interactive application root.
    expect(root?.getAttribute('tabindex')).toBeNull()
  })

  it('names each node select button by its content and selects on keyboard activation', () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const host = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      nodeRenderers: { task: (n: FlowNode) => h('span', String(n.data)) },
      onSelectionChange,
      onNodeClick,
    })
    const selectButton = host.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    expect(selectButton).not.toBeNull()
    expect(selectButton.type).toBe('button')
    // The button sits beneath the content (a sibling, never a wrapper) and is
    // named by it.
    expect(selectButton.textContent).toBe('')
    const content = host.querySelector(`[id="${selectButton.getAttribute('aria-labelledby')}"]`)
    expect(content).not.toBeNull()
    expect(selectButton.contains(content)).toBe(false)
    // Browsers synthesize a click with `detail === 0` when Enter / Space
    // activates a focused button — that is the keyboard path.
    clickWithDetail(selectButton, 0)
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: ['a'], edgeIds: [] })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('names a node with an ariaLabel by it', () => {
    const host = render({
      nodes: [{ ...node('a', 0, 0), ariaLabel: 'Start step' }],
      edges: [],
      nodeRenderers: { task: (n: FlowNode) => h('span', String(n.data)) },
    })
    const selectButton = host.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    // The node's own name wins over naming the button by its content.
    expect(selectButton.getAttribute('aria-label')).toBe('Start step')
    expect(selectButton.getAttribute('aria-labelledby')).toBeNull()
  })

  it('names a node with no renderer and no children by its number', () => {
    const host = render({ nodes: [node('a', 0, 0), node('b', 200, 0)], edges: [] })
    // An empty node still needs an operable select button: the canvas names
    // it after the node's position, one-based.
    const a = host.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const b = host.querySelector('button[data-mol-id="flow-canvas-node-select-b"]')!
    expect(a.getAttribute('aria-label')).toBe('Node 1')
    expect(b.getAttribute('aria-label')).toBe('Node 2')
    expect(a.getAttribute('aria-labelledby')).toBeNull()
    expect(b.getAttribute('aria-labelledby')).toBeNull()
  })

  it('keeps the controls a renderer draws outside the select button', () => {
    const host = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      nodeRenderers: {
        task: () => h('input', { 'aria-label': 'Step name' }),
      },
    })
    const selectButton = host.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const input = host.querySelector('input[aria-label="Step name"]')!
    expect(input).not.toBeNull()
    expect(selectButton.contains(input)).toBe(false)
    expect(input.closest('button')).toBeNull()
  })

  it('does not double-notify when a pointer click passes through the select button', () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const host = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      onSelectionChange,
      onNodeClick,
    })
    const selectButton = host.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    // Pointer path: pointerdown selects (bubbling to the node group);
    // the resulting click has detail > 0 and must NOT select again.
    pointer(selectButton, 'pointerdown', 5, 5)
    clickWithDetail(selectButton, 1)
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('renders one absolutely-positioned div per node', () => {
    const nodes = [node('a', 10, 20), node('b', 200, 100)]
    const host = render({ nodes, edges: [] })
    expect(host.querySelector('[data-mol-id="flow-canvas-node-a"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="flow-canvas-node-b"]')).not.toBeNull()
    const a = host.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
    expect(a.style.transform).toContain('translate(10px, 20px)')
  })

  it('renders an SVG path per edge', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const host = render({ nodes, edges })
    const path = host.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('d')).toMatch(/^M /)
  })

  it('passes node data to nodeRenderers when type matches', () => {
    const host = render({
      nodes: [node('a', 0, 0)],
      edges: [],
      nodeRenderers: {
        task: (n: FlowNode) =>
          h('span', { 'data-test': 'label' }, String((n.data as { label: string }).label)),
      },
    })
    const label = host.querySelector('[data-test="label"]')
    expect(label?.textContent).toBe('A')
  })

  it('uses children as a fallback renderer', () => {
    // The DEFAULT slot is the children fallback.
    const host = render(
      { nodes: [node('a', 0, 0)], edges: [] },
      {
        default: () => [h('span', { 'data-test': 'fallback' }, 'fallback')],
      },
    )
    expect(host.querySelector('[data-test="fallback"]')).not.toBeNull()
  })

  it('selects an edge on click and surfaces it via onSelectionChange', async () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onSelectionChange = vi.fn()
    const onEdgeClick = vi.fn()
    const host = render({ nodes, edges, onSelectionChange, onEdgeClick })
    const hit = host.querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: [], edgeIds: ['e1'] })
    expect(onEdgeClick).toHaveBeenCalledTimes(1)
    expect(onEdgeClick.mock.calls[0]![0]).toMatchObject({ id: 'e1' })
    await nextTick()
    // Selected edge is rendered with a higher stroke-width.
    const path = host.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path?.getAttribute('data-selected')).toBe('true')
  })

  it('removes selected edge on Backspace (controlled mode)', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const host = render({ nodes, edges, onChange })
    host
      .querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0].edges).toEqual([])
    expect(onChange.mock.calls[0]![0].nodes).toEqual(nodes)
  })

  it('removes selected node and its edges on Delete (uncontrolled mode)', async () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const host = render({ nodes, edges })
    // Click a node body to select it.
    const nodeA = host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    pointer(nodeA, 'pointerdown', 10, 10)
    pointer(nodeA, 'pointerup', 10, 10)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    await nextTick()
    expect(host.querySelector('[data-mol-id="flow-canvas-node-a"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="flow-canvas-edge-e1"]')).toBeNull()
  })

  it('drag-translates a node and emits a single onChange per pointermove (controlled)', () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    // Make getBoundingClientRect return a fixed origin so clientToWorld math is stable.
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = () =>
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
    try {
      const host = render({ nodes, edges: [], onChange })
      const nodeA = host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
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

  it('controlled vs uncontrolled: uncontrolled drag updates DOM without onChange', async () => {
    const nodes = [node('a', 0, 0)]
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = () =>
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
    try {
      const host = render({ nodes, edges: [] })
      const nodeA = host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
      pointer(nodeA, 'pointerdown', 0, 0)
      pointer(nodeA, 'pointermove', 25, 15)
      pointer(nodeA, 'pointerup', 25, 15)
      await nextTick()
      const updated = host.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
      expect(updated.style.transform).toContain('translate(25px, 15px)')
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('draws an edge between nodes when the source handle is dragged onto a target', () => {
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = () =>
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
    try {
      const host = render({ nodes, edges: [], onChange })
      const handleA = host.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = host.querySelector('[data-mol-id="flow-canvas-node-b"]')!
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
    HTMLElement.prototype.getBoundingClientRect = () =>
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
    try {
      const host = render({ nodes, edges: [], onChange })
      const handleA = host.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = host.querySelector('[data-mol-id="flow-canvas-node-b"]')!

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
    const host = render({ nodes, edges: [], onChange })
    const handleA = host.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
    const nodeA = host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    pointer(handleA, 'pointerdown', 180, 40)
    pointer(nodeA, 'pointerup', 100, 40)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hides the grid when showGrid={false}', () => {
    const host = render({ nodes: [], edges: [], showGrid: false })
    expect(host.querySelector('[data-mol-id="flow-canvas-grid"]')).toBeNull()
  })
})
