// @vitest-environment jsdom
/**
 * Unit tests of `GraphView` — the port of
 * `@molecule/app-feature-graph-view-react`'s own suite. The React suite renders
 * the component and asserts the markup; this port mounts the same tree through
 * Angular's real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same markup strings.
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
  type Type,
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { GraphView } from '../graph-view.component.js'
import type { GraphEdge, GraphNode } from '../types.js'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
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
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template's component element, binding every scalar prop. */
const ELEMENT =
  `<div mol-graph-view [nodes]="p['nodes']" [edges]="p['edges']" [layout]="p['layout']"` +
  ` [selectedNodeId]="p['selectedNodeId']" [onNodeClick]="p['onNodeClick']"` +
  ` [forceOptions]="p['forceOptions']" [className]="p['className']"></div>`

const mounted: Mounted[] = []

/**
 * Mounts a `GraphView` into a spec host.
 *
 * @param props - The component props.
 * @param renderers - Extra template markup (a renderer's `<ng-template>`).
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, renderers = ''): Promise<Mounted> => {
  const template = renderers ? `${renderers}${ELEMENT}` : ELEMENT
  const m = await mount(template, GraphView as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

const node = (id: string, label = id.toUpperCase()): GraphNode => ({ id, label })

describe('<GraphView>', () => {
  it('renders a labelled application root', async () => {
    const m = await render({ nodes: [], edges: [] })
    const root = m.host.querySelector('[data-mol-id="graph-view"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    expect(root?.getAttribute('aria-label')).toBe('Graph view')
  })

  it('shows the empty-state message when given no nodes', async () => {
    const m = await render({ nodes: [], edges: [] })
    const empty = m.host.querySelector('[data-mol-id="graph-view-empty"]')
    expect(empty).not.toBeNull()
    expect(empty?.textContent?.trim()).toBe('No nodes to display')
    // No SVG rendered when empty.
    expect(m.host.querySelector('[data-mol-id="graph-view-svg"]')).toBeNull()
  })

  it('renders one node-hit group per node and one line per edge', async () => {
    const ns = [node('a'), node('b'), node('c')]
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const m = await render({ nodes: ns, edges, layout: 'circular' })
    expect(m.host.querySelectorAll('[data-mol-id^="graph-view-node-hit-"]').length).toBe(3)
    expect(m.host.querySelectorAll('line[data-mol-id^="graph-view-edge-"]').length).toBe(2)
  })

  it('drops edges whose endpoints are missing', async () => {
    const ns = [node('a')]
    const edges: GraphEdge[] = [{ id: 'orphan', source: 'a', target: 'missing' }]
    const m = await render({ nodes: ns, edges, layout: 'circular' })
    expect(m.host.querySelector('[data-mol-id="graph-view-edge-orphan"]')).toBeNull()
  })

  it('fires onNodeClick with the clicked node', async () => {
    const ns = [node('a'), node('b')]
    const onNodeClick = vi.fn()
    const m = await render({ nodes: ns, edges: [], layout: 'circular', onNodeClick })
    const hit = m.host.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(onNodeClick.mock.calls[0][0].id).toBe('a')
  })

  it('activates a node via Enter / Space keyboard events', async () => {
    const ns = [node('a')]
    const onNodeClick = vi.fn()
    const m = await render({ nodes: ns, edges: [], layout: 'circular', onNodeClick })
    const hit = m.host.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onNodeClick).toHaveBeenCalledTimes(2)
  })

  it('marks the selected node via data-selected', async () => {
    const ns = [node('a'), node('b')]
    const m = await render({ nodes: ns, edges: [], layout: 'circular', selectedNodeId: 'b' })
    const a = m.host.querySelector('[data-mol-id="graph-view-node-a"]')
    const b = m.host.querySelector('[data-mol-id="graph-view-node-b"]')
    expect(a?.getAttribute('data-selected')).toBe('false')
    expect(b?.getAttribute('data-selected')).toBe('true')
  })

  it('uses the provided nodeRenderer when supplied', async () => {
    const ns = [node('a', 'Alpha')]
    const renderers = `<ng-template #nodeTpl let-n="a0"><text data-test="custom" [attr.x]="n.x" [attr.y]="n.y">{{ n.label }}</text></ng-template>`
    const template = `${renderers}<div mol-graph-view [nodes]="p['nodes']" [edges]="p['edges']" [layout]="p['layout']" [nodeRenderer]="nodeTpl"></div>`
    const m = await mount(template, GraphView as Type<unknown>, {
      nodes: ns,
      edges: [],
      layout: 'circular',
    })
    mounted.push(m)
    const custom = m.host.querySelector('[data-test="custom"]')
    expect(custom?.textContent).toBe('Alpha')
    // Default circle should NOT have rendered alongside it.
    expect(m.host.querySelector('[data-mol-id="graph-view-node-a"]')).toBeNull()
  })

  it('uses the provided edgeRenderer when supplied', async () => {
    const ns = [node('a'), node('b')]
    const edges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const renderers = `<ng-template #edgeTpl let-e="a0" let-s="a1" let-t="a2"><line data-test="custom-edge" [attr.x1]="s.x" [attr.y1]="s.y" [attr.x2]="t.x" [attr.y2]="t.y" /></ng-template>`
    const template = `${renderers}<div mol-graph-view [nodes]="p['nodes']" [edges]="p['edges']" [layout]="p['layout']" [edgeRenderer]="edgeTpl"></div>`
    const m = await mount(template, GraphView as Type<unknown>, {
      nodes: ns,
      edges,
      layout: 'circular',
    })
    mounted.push(m)
    expect(m.host.querySelector('[data-test="custom-edge"]')).not.toBeNull()
    // Default <line> path should not have been emitted.
    expect(m.host.querySelector(`line[data-mol-id="graph-view-edge-e1"]`)).toBeNull()
  })

  it('force layout: produces an SVG with a finite viewBox', async () => {
    const ns = [node('a'), node('b'), node('c'), node('d')]
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'c', target: 'd' },
    ]
    const m = await render({
      nodes: ns,
      edges,
      layout: 'force',
      forceOptions: { seed: 1, iterations: 50 },
    })
    const svg = m.host.querySelector('[data-mol-id="graph-view-svg"]')
    const viewBox = svg?.getAttribute('viewBox') ?? ''
    expect(viewBox).not.toBe('')
    const parts = viewBox.split(' ').map(Number)
    expect(parts).toHaveLength(4)
    for (const v of parts) expect(Number.isFinite(v)).toBe(true)
  })
})
