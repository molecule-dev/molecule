// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { GraphView } from '../GraphView.js'
import type { GraphEdge, GraphNode } from '../types.js'

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
})

const node = (id: string, label = id.toUpperCase()): GraphNode => ({ id, label })

describe('<GraphView>', () => {
  it('renders a labelled application root', () => {
    const { container } = render(
      <Wrap>
        <GraphView nodes={[]} edges={[]} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="graph-view"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('application')
  })

  it('shows the empty-state message when given no nodes', () => {
    const { container } = render(
      <Wrap>
        <GraphView nodes={[]} edges={[]} />
      </Wrap>,
    )
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
    const { container } = render(
      <Wrap>
        <GraphView nodes={ns} edges={edges} layout="circular" />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id^="graph-view-node-hit-"]').length).toBe(3)
    expect(container.querySelectorAll('line[data-mol-id^="graph-view-edge-"]').length).toBe(2)
  })

  it('drops edges whose endpoints are missing', () => {
    const ns = [node('a')]
    const edges: GraphEdge[] = [{ id: 'orphan', source: 'a', target: 'missing' }]
    const { container } = render(
      <Wrap>
        <GraphView nodes={ns} edges={edges} layout="circular" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="graph-view-edge-orphan"]')).toBeNull()
  })

  it('fires onNodeClick with the clicked node', () => {
    const ns = [node('a'), node('b')]
    const onNodeClick = vi.fn()
    const { container } = render(
      <Wrap>
        <GraphView nodes={ns} edges={[]} layout="circular" onNodeClick={onNodeClick} />
      </Wrap>,
    )
    const hit = container.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    fireEvent.click(hit)
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(onNodeClick.mock.calls[0][0].id).toBe('a')
  })

  it('activates a node via Enter / Space keyboard events', () => {
    const ns = [node('a')]
    const onNodeClick = vi.fn()
    const { container } = render(
      <Wrap>
        <GraphView nodes={ns} edges={[]} layout="circular" onNodeClick={onNodeClick} />
      </Wrap>,
    )
    const hit = container.querySelector('[data-mol-id="graph-view-node-hit-a"]')!
    fireEvent.keyDown(hit, { key: 'Enter' })
    fireEvent.keyDown(hit, { key: ' ' })
    expect(onNodeClick).toHaveBeenCalledTimes(2)
  })

  it('marks the selected node via data-selected', () => {
    const ns = [node('a'), node('b')]
    const { container } = render(
      <Wrap>
        <GraphView nodes={ns} edges={[]} layout="circular" selectedNodeId="b" />
      </Wrap>,
    )
    const a = container.querySelector('[data-mol-id="graph-view-node-a"]')
    const b = container.querySelector('[data-mol-id="graph-view-node-b"]')
    expect(a?.getAttribute('data-selected')).toBe('false')
    expect(b?.getAttribute('data-selected')).toBe('true')
  })

  it('uses the provided nodeRenderer when supplied', () => {
    const ns = [node('a', 'Alpha')]
    const { container } = render(
      <Wrap>
        <GraphView
          nodes={ns}
          edges={[]}
          layout="circular"
          nodeRenderer={(n) => (
            <text data-test="custom" x={n.x} y={n.y}>
              {n.label}
            </text>
          )}
        />
      </Wrap>,
    )
    const custom = container.querySelector('[data-test="custom"]')
    expect(custom?.textContent).toBe('Alpha')
    // Default circle should NOT have rendered alongside it.
    expect(container.querySelector('[data-mol-id="graph-view-node-a"]')).toBeNull()
  })

  it('uses the provided edgeRenderer when supplied', () => {
    const ns = [node('a'), node('b')]
    const edges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const { container } = render(
      <Wrap>
        <GraphView
          nodes={ns}
          edges={edges}
          layout="circular"
          edgeRenderer={(_e, s, t) => (
            <line data-test="custom-edge" x1={s.x} y1={s.y} x2={t.x} y2={t.y} />
          )}
        />
      </Wrap>,
    )
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
    const { container } = render(
      <Wrap>
        <GraphView
          nodes={ns}
          edges={edges}
          layout="force"
          forceOptions={{ seed: 1, iterations: 50 }}
        />
      </Wrap>,
    )
    const svg = container.querySelector('[data-mol-id="graph-view-svg"]')
    const viewBox = svg?.getAttribute('viewBox') ?? ''
    expect(viewBox).not.toBe('')
    const parts = viewBox.split(' ').map(Number)
    expect(parts).toHaveLength(4)
    for (const v of parts) expect(Number.isFinite(v)).toBe(true)
  })
})
