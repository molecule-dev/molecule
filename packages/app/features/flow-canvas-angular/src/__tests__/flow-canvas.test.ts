// @vitest-environment jsdom
/**
 * Unit tests of `FlowCanvas` — the port of
 * `@molecule/app-flow-canvas-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { FlowCanvas } from '../flow-canvas.component.js'
import type { FlowChange, FlowEdge, FlowNode } from '../types.js'

/** The input bindings every host template passes through `p`. */
const BIND = `[nodes]="p['nodes']" [edges]="p['edges']" [onChange]="p['onChange']" [nodeRenderers]="taskRenderer ? { task: taskRenderer } : undefined" [onSelectionChange]="p['onSelectionChange']" [onEdgeClick]="p['onEdgeClick']" [onNodeClick]="p['onNodeClick']" [disableDeleteShortcut]="p['disableDeleteShortcut']" [disablePan]="p['disablePan']" [disableZoom]="p['disableZoom']" [showGrid]="p['showGrid']" [initialViewport]="p['initialViewport']" [className]="p['className']"`

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection, as an event does before the browser draws. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param inner - The element's projected content and renderer templates.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(inner: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const template = `<div mol-flow-canvas ${BIND}>${inner}</div>`
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [FlowCanvas],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
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

const mounted: Mounted[] = []

const render = async (inner = '', props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(inner, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<FlowCanvas>', () => {
  it('renders a labelled application root without a tab stop', async () => {
    const m = await render('', { nodes: [], edges: [] })
    const root = m.host.querySelector('[data-mol-id="flow-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    expect(root?.getAttribute('tabindex')).toBeNull()
  })

  it('names each node select button by its content and selects on keyboard activation', async () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const m = await render(
      `<ng-template #taskRenderer let-node><span>{{ node.data.label }}</span></ng-template>`,
      { nodes: [node('a', 0, 0)], edges: [], onSelectionChange, onNodeClick },
    )
    const selectButton = m.host.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    expect(selectButton).not.toBeNull()
    expect(selectButton.type).toBe('button')
    expect(selectButton.textContent).toBe('')
    const content = m.host.querySelector(`[id="${selectButton.getAttribute('aria-labelledby')}"]`)
    expect(content?.textContent).toBe('A')
    expect(selectButton.contains(content)).toBe(false)
    clickWithDetail(selectButton, 0)
    m.tick()
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: ['a'], edgeIds: [] })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('names a node with an ariaLabel by it', async () => {
    const m = await render(
      `<ng-template #taskRenderer let-node><span>{{ node.data.label }}</span></ng-template>`,
      { nodes: [{ ...node('a', 0, 0), ariaLabel: 'Start step' }], edges: [] },
    )
    const selectButton = m.host.querySelector(
      'button[data-mol-id="flow-canvas-node-select-a"]',
    ) as HTMLButtonElement
    // The node's own name wins over naming the button by its content.
    expect(selectButton.getAttribute('aria-label')).toBe('Start step')
    expect(selectButton.getAttribute('aria-labelledby')).toBeNull()
  })

  it('names a node with no renderer and no children by its number', async () => {
    const m = await render('', { nodes: [node('a', 0, 0), node('b', 200, 0)], edges: [] })
    // An empty node still needs an operable select button: the canvas names
    // it after the node's position, one-based.
    const a = m.host.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const b = m.host.querySelector('button[data-mol-id="flow-canvas-node-select-b"]')!
    expect(a.getAttribute('aria-label')).toBe('Node 1')
    expect(b.getAttribute('aria-label')).toBe('Node 2')
    expect(a.getAttribute('aria-labelledby')).toBeNull()
    expect(b.getAttribute('aria-labelledby')).toBeNull()
  })

  it('keeps the controls a renderer draws outside the select button', async () => {
    const m = await render(
      `<ng-template #taskRenderer><input aria-label="Step name"></ng-template>`,
      { nodes: [node('a', 0, 0)], edges: [] },
    )
    const selectButton = m.host.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    const input = m.host.querySelector('input[aria-label="Step name"]')!
    expect(input).not.toBeNull()
    expect(selectButton.contains(input)).toBe(false)
    expect(input.closest('button')).toBeNull()
  })

  it('does not double-notify when a pointer click passes through the select button', async () => {
    const onSelectionChange = vi.fn()
    const onNodeClick = vi.fn()
    const m = await render('', {
      nodes: [node('a', 0, 0)],
      edges: [],
      onSelectionChange,
      onNodeClick,
    })
    const selectButton = m.host.querySelector('button[data-mol-id="flow-canvas-node-select-a"]')!
    pointer(selectButton, 'pointerdown', 5, 5)
    clickWithDetail(selectButton, 1)
    m.tick()
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('renders one absolutely-positioned div per node', async () => {
    const nodes = [node('a', 10, 20), node('b', 200, 100)]
    const m = await render('', { nodes, edges: [] })
    expect(m.host.querySelector('[data-mol-id="flow-canvas-node-a"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="flow-canvas-node-b"]')).not.toBeNull()
    const a = m.host.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
    expect(a.style.transform).toContain('translate(10px, 20px)')
  })

  it('renders an SVG path per edge', async () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const m = await render('', { nodes, edges })
    const path = m.host.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('d')).toMatch(/^M /)
  })

  it('passes node data to nodeRenderers when type matches', async () => {
    const m = await render(
      `<ng-template #taskRenderer let-node><span data-test="label">{{ node.data.label }}</span></ng-template>`,
      { nodes: [node('a', 0, 0)], edges: [] },
    )
    const label = m.host.querySelector('[data-test="label"]')
    expect(label?.textContent).toBe('A')
  })

  it('uses children as a fallback renderer', async () => {
    const m = await render('<span data-test="fallback">fallback</span>', {
      nodes: [node('a', 0, 0)],
      edges: [],
    })
    expect(m.host.querySelector('[data-test="fallback"]')).not.toBeNull()
  })

  it('selects an edge on click and surfaces it via onSelectionChange', async () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onSelectionChange = vi.fn()
    const onEdgeClick = vi.fn()
    const m = await render('', { nodes, edges, onSelectionChange, onEdgeClick })
    const hit = m.host.querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    m.tick()
    expect(onSelectionChange).toHaveBeenCalledWith({ nodeIds: [], edgeIds: ['e1'] })
    expect(onEdgeClick).toHaveBeenCalledTimes(1)
    expect(onEdgeClick.mock.calls[0]![0]).toMatchObject({ id: 'e1' })
    const path = m.host.querySelector('[data-mol-id="flow-canvas-edge-e1"]')
    expect(path?.getAttribute('data-selected')).toBe('true')
  })

  it('removes selected edge on Backspace (controlled mode)', async () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const m = await render('', { nodes, edges, onChange })
    m.host
      .querySelector('[data-mol-id="flow-canvas-edge-hit-e1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    m.tick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    m.tick()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0].edges).toEqual([])
    expect(onChange.mock.calls[0]![0].nodes).toEqual(nodes)
  })

  it('removes selected node and its edges on Delete (uncontrolled mode)', async () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0)]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const m = await render('', { nodes, edges })
    const nodeA = m.host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    pointer(nodeA, 'pointerdown', 10, 10)
    m.tick()
    pointer(nodeA, 'pointerup', 10, 10)
    m.tick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    m.tick()
    expect(m.host.querySelector('[data-mol-id="flow-canvas-node-a"]')).toBeNull()
    expect(m.host.querySelector('[data-mol-id="flow-canvas-edge-e1"]')).toBeNull()
  })

  it('drag-translates a node and emits a single onChange per pointermove (controlled)', async () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const m = await render('', { nodes, edges: [], onChange })
      const nodeA = m.host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
      pointer(nodeA, 'pointerdown', 50, 50)
      m.tick()
      pointer(nodeA, 'pointermove', 70, 60)
      m.tick()
      pointer(nodeA, 'pointerup', 70, 60)
      m.tick()
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
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const m = await render('', { nodes, edges: [] })
      const nodeA = m.host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
      pointer(nodeA, 'pointerdown', 0, 0)
      m.tick()
      pointer(nodeA, 'pointermove', 25, 15)
      m.tick()
      pointer(nodeA, 'pointerup', 25, 15)
      m.tick()
      const updated = m.host.querySelector('[data-mol-id="flow-canvas-node-a"]') as HTMLElement
      expect(updated.style.transform).toContain('translate(25px, 15px)')
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('draws an edge between nodes when the source handle is dragged onto a target', async () => {
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const m = await render('', { nodes, edges: [], onChange })
      const handleA = m.host.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = m.host.querySelector('[data-mol-id="flow-canvas-node-b"]')!
      pointer(handleA, 'pointerdown', 180, 40)
      m.tick()
      pointer(nodeB, 'pointerup', 320, 40)
      m.tick()
      expect(onChange).toHaveBeenCalled()
      const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
      expect(last.edges).toHaveLength(1)
      expect(last.edges[0]).toMatchObject({ source: 'a', target: 'b' })
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
    }
  })

  it('gives two edges drawn in the same millisecond distinct ids', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const nodes = [node('a', 0, 0), node('b', 300, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const origGet = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = fixedRect
    try {
      const m = await render('', { nodes, edges: [], onChange })
      const handleA = m.host.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
      const nodeB = m.host.querySelector('[data-mol-id="flow-canvas-node-b"]')!

      pointer(handleA, 'pointerdown', 180, 40)
      m.tick()
      pointer(nodeB, 'pointerup', 320, 40)
      m.tick()
      pointer(handleA, 'pointerdown', 180, 40)
      m.tick()
      pointer(nodeB, 'pointerup', 320, 40)
      m.tick()

      expect(onChange).toHaveBeenCalledTimes(2)
      const ids = onChange.mock.calls.map(([change]) => change.edges[0]!.id)
      expect(new Set(ids).size).toBe(2)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origGet
      now.mockRestore()
    }
  })

  it('does NOT create a self-loop when handle is released over the same node', async () => {
    const nodes = [node('a', 0, 0)]
    const onChange = vi.fn<(next: FlowChange) => void>()
    const m = await render('', { nodes, edges: [], onChange })
    const handleA = m.host.querySelector('[data-mol-id="flow-canvas-node-handle-a"]')!
    const nodeA = m.host.querySelector('[data-mol-id="flow-canvas-node-a"]')!
    pointer(handleA, 'pointerdown', 180, 40)
    m.tick()
    pointer(nodeA, 'pointerup', 100, 40)
    m.tick()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hides the grid when showGrid={false}', async () => {
    const m = await render('', { nodes: [], edges: [], showGrid: false })
    expect(m.host.querySelector('[data-mol-id="flow-canvas-grid"]')).toBeNull()
  })
})
