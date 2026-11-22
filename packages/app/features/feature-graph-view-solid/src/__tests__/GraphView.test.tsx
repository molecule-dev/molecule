// @vitest-environment jsdom
/**
 * Unit tests for the Solid `GraphView` — a port of
 * `@molecule/app-feature-graph-view-react/src/__tests__/GraphView.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { GraphEdge, GraphNode, GraphViewProps } from '../types.js'

const { GraphView } = await import('../GraphView.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and dispose after the test. */
const mount = (props: GraphViewProps): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <GraphView {...props} />, container))
  return container
}

const node = (id: string, label = id.toUpperCase()): GraphNode => ({ id, label })

describe('<GraphView>', () => {
  it('renders a labelled application root', () => {
    const container = mount({ nodes: [], edges: [] })
    const root = container.querySelector('[data-mol-id="graph-view"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    expect(root?.getAttribute('aria-label')).toBe('Graph view')
  })

  it('shows the empty-state message when given no nodes', () => {
    const container = mount({ nodes: [], edges: [] })
    const empty = container.querySelector('[data-mol-id="graph-view-empty"]')
    expect(empty).not.toBeNull()
    expect(empty?.textContent).toBe('No nodes to display')
    // No SVG rendered when empty.
    expect(container.querySelector('[data-mol-id="graph-view-svg"]')).toBeNull()
  })

  it('renders one node-hit group per node and one line per edge', () => {
    const ns = [node('a'), node('b'), node('c')]
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const container = mount({ nodes: ns, edges, layout: 'circular' })
    expect(container.querySelectorAll('[data-mol-id^="graph-view-node-hit-"]').length).toBe(3)
    expect(container.querySelectorAll('line[data-mol-id^="graph-view-edge-"]').length).toBe(2)
  })

  it('drops edges whose endpoints are missing', () => {
    const ns = [node('a')]
    const edges: GraphEdge[] = [{ id: 'orphan', source: 'a', target: 'missing' }]
    const container = mount({ nodes: ns, edges, layout: 'circular' })
    expect(container.querySelector('[data-mol-id="graph-view-edge-orphan"]')).toBeNull()
  })

  it('fires onNodeClick with the clicked node', () => {
    const ns = [node('a'), node('b')]
    const onNodeClick = vi.fn()
    const container = mount({ nodes: ns, edges: [], layout: 'circular', onNodeClick })
    const hit = container.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(onNodeClick.mock.calls[0][0].id).toBe('a')
  })

  it('activates a node via Enter / Space keyboard events', () => {
    const ns = [node('a')]
    const onNodeClick = vi.fn()
    const container = mount({ nodes: ns, edges: [], layout: 'circular', onNodeClick })
    const hit = container.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onNodeClick).toHaveBeenCalledTimes(2)
  })

  it('marks the selected node via data-selected', () => {
    const ns = [node('a'), node('b')]
    const container = mount({ nodes: ns, edges: [], layout: 'circular', selectedNodeId: 'b' })
    const a = container.querySelector('[data-mol-id="graph-view-node-a"]')
    const b = container.querySelector('[data-mol-id="graph-view-node-b"]')
    expect(a?.getAttribute('data-selected')).toBe('false')
    expect(b?.getAttribute('data-selected')).toBe('true')
  })

  it('uses the provided nodeRenderer when supplied', () => {
    const ns = [node('a', 'Alpha')]
    const container = mount({
      nodes: ns,
      edges: [],
      layout: 'circular',
      nodeRenderer: (n: { x: number; y: number; label: string }): JSX.Element => (
        <text data-test="custom" x={n.x} y={n.y}>
          {n.label}
        </text>
      ),
    })
    const custom = container.querySelector('[data-test="custom"]')
    expect(custom?.textContent).toBe('Alpha')
    // Default circle should NOT have rendered alongside it.
    expect(container.querySelector('[data-mol-id="graph-view-node-a"]')).toBeNull()
  })

  it('uses the provided edgeRenderer when supplied', () => {
    const ns = [node('a'), node('b')]
    const edges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const container = mount({
      nodes: ns,
      edges,
      layout: 'circular',
      edgeRenderer: (
        _e: GraphEdge,
        s: { x: number; y: number },
        t: { x: number; y: number },
      ): JSX.Element => <line data-test="custom-edge" x1={s.x} y1={s.y} x2={t.x} y2={t.y} />,
    })
    expect(container.querySelector('[data-test="custom-edge"]')).not.toBeNull()
    // Default <line> path should not have been emitted.
    expect(container.querySelector(`line[data-mol-id="graph-view-edge-e1"]`)).toBeNull()
  })

  it('force layout: produces an SVG with a finite viewBox', () => {
    const ns = [node('a'), node('b'), node('c'), node('d')]
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'c', target: 'd' },
    ]
    const container = mount({
      nodes: ns,
      edges,
      layout: 'force',
      forceOptions: { seed: 1, iterations: 50 },
    })
    const svg = container.querySelector('[data-mol-id="graph-view-svg"]')
    const viewBox = svg?.getAttribute('viewBox') ?? ''
    expect(viewBox).not.toBe('')
    const parts = viewBox.split(' ').map(Number)
    expect(parts).toHaveLength(4)
    for (const v of parts) expect(Number.isFinite(v)).toBe(true)
  })
})
