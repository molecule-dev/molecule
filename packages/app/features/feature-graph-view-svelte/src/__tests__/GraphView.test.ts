// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `GraphView` — a port of
 * `@molecule/app-feature-graph-view-react/src/__tests__/GraphView.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom), the
 * bonded ClassMap and the bonded i18n provider.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GraphView from '../GraphView.svelte'
import type { GraphEdge, GraphNode, GraphViewProps, PositionedNode } from '../types.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Renders a `GraphView` with the given props.
 *
 * @param props - The component props.
 * @returns The target element the component rendered into.
 */
const render = (props: GraphViewProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(GraphView, { target, props }))
  flushSync()
  return target
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

const node = (id: string, label = id.toUpperCase()): GraphNode => ({ id, label })

describe('<GraphView>', () => {
  it('renders a labelled application root', () => {
    const target = render({ nodes: [], edges: [] })
    const root = target.querySelector('[data-mol-id="graph-view"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
    expect(root?.getAttribute('aria-label')).toBe('Graph view')
  })

  it('shows the empty-state message when given no nodes', () => {
    const target = render({ nodes: [], edges: [] })
    const empty = target.querySelector('[data-mol-id="graph-view-empty"]')
    expect(empty).not.toBeNull()
    expect(empty?.textContent).toBe('No nodes to display')
    // No SVG rendered when empty.
    expect(target.querySelector('[data-mol-id="graph-view-svg"]')).toBeNull()
  })

  it('renders one node-hit group per node and one line per edge', () => {
    const ns = [node('a'), node('b'), node('c')]
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const target = render({ nodes: ns, edges, layout: 'circular' })
    expect(target.querySelectorAll('[data-mol-id^="graph-view-node-hit-"]').length).toBe(3)
    expect(target.querySelectorAll('line[data-mol-id^="graph-view-edge-"]').length).toBe(2)
  })

  it('drops edges whose endpoints are missing', () => {
    const ns = [node('a')]
    const edges: GraphEdge[] = [{ id: 'orphan', source: 'a', target: 'missing' }]
    const target = render({ nodes: ns, edges, layout: 'circular' })
    expect(target.querySelector('[data-mol-id="graph-view-edge-orphan"]')).toBeNull()
  })

  it('fires onNodeClick with the clicked node', () => {
    const ns = [node('a'), node('b')]
    const onNodeClick = vi.fn()
    const target = render({ nodes: ns, edges: [], layout: 'circular', onNodeClick })
    const hit = target.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(onNodeClick.mock.calls[0][0].id).toBe('a')
  })

  it('activates a node via Enter / Space keyboard events', () => {
    const ns = [node('a')]
    const onNodeClick = vi.fn()
    const target = render({ nodes: ns, edges: [], layout: 'circular', onNodeClick })
    const hit = target.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onNodeClick).toHaveBeenCalledTimes(2)
  })

  it('marks the selected node via data-selected', () => {
    const ns = [node('a'), node('b')]
    const target = render({ nodes: ns, edges: [], layout: 'circular', selectedNodeId: 'b' })
    const a = target.querySelector('[data-mol-id="graph-view-node-a"]')
    const b = target.querySelector('[data-mol-id="graph-view-node-b"]')
    expect(a?.getAttribute('data-selected')).toBe('false')
    expect(b?.getAttribute('data-selected')).toBe('true')
  })

  it('uses the provided nodeRenderer when supplied', () => {
    const ns = [node('a', 'Alpha')]
    const nodeRenderer = createRawSnippet<[PositionedNode]>((n) => ({
      render: () => `<text data-test="custom" x="${n().x}" y="${n().y}">${n().label}</text>`,
    }))
    const target = render({ nodes: ns, edges: [], layout: 'circular', nodeRenderer })
    const custom = target.querySelector('[data-test="custom"]')
    expect(custom?.textContent).toBe('Alpha')
    // Default circle should NOT have rendered alongside it.
    expect(target.querySelector('[data-mol-id="graph-view-node-a"]')).toBeNull()
  })

  it('uses the provided edgeRenderer when supplied', () => {
    const ns = [node('a'), node('b')]
    const edges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const edgeRenderer = createRawSnippet<[GraphEdge, PositionedNode, PositionedNode]>(
      (_e, s, t) => ({
        render: () =>
          `<line data-test="custom-edge" x1="${s().x}" y1="${s().y}" x2="${t().x}" y2="${t().y}" />`,
      }),
    )
    const target = render({ nodes: ns, edges, layout: 'circular', edgeRenderer })
    expect(target.querySelector('[data-test="custom-edge"]')).not.toBeNull()
    // Default <line> path should not have been emitted.
    expect(target.querySelector(`line[data-mol-id="graph-view-edge-e1"]`)).toBeNull()
  })

  it('force layout: produces an SVG with a finite viewBox', () => {
    const ns = [node('a'), node('b'), node('c'), node('d')]
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'c', target: 'd' },
    ]
    const target = render({
      nodes: ns,
      edges,
      layout: 'force',
      forceOptions: { seed: 1, iterations: 50 },
    })
    const svg = target.querySelector('[data-mol-id="graph-view-svg"]')
    const viewBox = svg?.getAttribute('viewBox') ?? ''
    expect(viewBox).not.toBe('')
    const parts = viewBox.split(' ').map(Number)
    expect(parts).toHaveLength(4)
    for (const v of parts) expect(Number.isFinite(v)).toBe(true)
  })
})
