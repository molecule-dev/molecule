// @vitest-environment jsdom
/**
 * Unit tests for the Angular `CanvasEngine` — a port of
 * `@molecule/app-canvas-engine-react/src/__tests__/CanvasEngine.test.tsx`: the
 * same test names and behavioural assertions, mounted through Angular's real
 * renderer and asserted on the component's methods and the markup it produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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
        return (..._args: unknown[]): string => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { CanvasDocument, VectorElement } from '../types.js'
import { type MountedEngine, mountEngine } from './helpers.js'

const mounted: MountedEngine[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/**
 * The base document the React reference test renders.
 *
 * @returns A 800x600 document with a rect, an ellipse and a line.
 */
const baseDoc = (): CanvasDocument => ({
  width: 800,
  height: 600,
  layers: [
    { id: 'a', kind: 'rect', x: 0, y: 0, width: 100, height: 100, fill: '#ff0000' },
    { id: 'b', kind: 'ellipse', x: 200, y: 200, width: 80, height: 60, fill: '#00ff00' },
    { id: 'c', kind: 'line', x1: 0, y1: 400, x2: 200, y2: 500, stroke: '#0000ff' },
  ],
})

/**
 * The document a mounted engine last reported.
 *
 * @param m - The mounted engine.
 * @returns Its current document.
 */
const docOf = (m: MountedEngine): CanvasDocument => m.props()['document'] as CanvasDocument

/**
 * The selection a mounted engine last reported.
 *
 * @param m - The mounted engine.
 * @returns Its current selection.
 */
const selectionOf = (m: MountedEngine): readonly string[] =>
  m.props()['selection'] as readonly string[]

describe('<CanvasEngine>', () => {
  it('renders a labelled root and one SVG element per layer', async () => {
    const m = await mountEngine({ doc: baseDoc() })
    mounted.push(m)
    const root = m.host
    expect(root.getAttribute('data-mol-id')).toBe('canvas-engine')
    expect(root.getAttribute('data-canvas-engine-snap')).toBe('true')
    const surface = m.host.querySelector('[data-mol-id="canvas-surface"]')
    expect(surface?.getAttribute('aria-label')).toBe('Vector canvas editor')
    const svg = m.host.querySelector('[data-mol-id="canvas-engine-svg"]')
    expect(svg).not.toBeNull()
    const elements = m.host.querySelectorAll('[data-mol-id="canvas-engine-element"]')
    expect(elements.length).toBe(3)
  })

  it('renders rect, ellipse, line, path, text, and group kinds', async () => {
    const layers: VectorElement[] = [
      { id: 'r', kind: 'rect', x: 0, y: 0, width: 1, height: 1 },
      { id: 'e', kind: 'ellipse', x: 0, y: 0, width: 1, height: 1 },
      { id: 'l', kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1 },
      { id: 'p', kind: 'path', x: 0, y: 0, width: 1, height: 1, d: 'M0 0L1 1' },
      { id: 't', kind: 'text', x: 0, y: 0, width: 1, height: 1, text: 'hi' },
      {
        id: 'g',
        kind: 'group',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        children: [{ id: 'gx', kind: 'rect', x: 0, y: 0, width: 1, height: 1 }],
      },
    ]
    const m = await mountEngine({ doc: { width: 100, height: 100, layers } })
    mounted.push(m)
    expect(m.host.querySelector('rect')).not.toBeNull()
    expect(m.host.querySelector('ellipse')).not.toBeNull()
    expect(m.host.querySelector('line')).not.toBeNull()
    expect(m.host.querySelector('path')).not.toBeNull()
    expect(m.host.querySelector('text')?.textContent).toBe('hi')
  })

  it('toggles snap-to-grid via data attribute', async () => {
    const m = await mountEngine({ doc: baseDoc(), props: { snapToGrid: false } })
    mounted.push(m)
    expect(m.host.getAttribute('data-canvas-engine-snap')).toBe('false')
    m.setProps({ snapToGrid: true })
    expect(m.host.getAttribute('data-canvas-engine-snap')).toBe('true')
  })

  it('exposes alignment via the imperative handle', async () => {
    const m = await mountEngine({ doc: baseDoc(), selection: ['a', 'b'], controlled: true })
    mounted.push(m)
    m.engine().align('left')
    m.tick()
    const a = docOf(m).layers.find((l) => l.id === 'a') as Extract<VectorElement, { kind: 'rect' }>
    const b = docOf(m).layers.find((l) => l.id === 'b') as Extract<
      VectorElement,
      { kind: 'ellipse' }
    >
    expect(a.x).toBe(0)
    expect(b.x).toBe(0)
  })

  it('groups and ungroups via the imperative handle', async () => {
    const m = await mountEngine({ doc: baseDoc(), selection: ['a', 'b'], controlled: true })
    mounted.push(m)
    m.engine().group()
    m.tick()
    const groups = docOf(m).layers.filter((l) => l.kind === 'group')
    expect(groups.length).toBe(1)
    expect(groups[0]!.children.length).toBe(2)
    expect(selectionOf(m).length).toBe(1)

    // Ungroup the new group.
    m.engine().ungroup()
    m.tick()
    expect(docOf(m).layers.filter((l) => l.kind === 'group').length).toBe(0)
    expect(docOf(m).layers.length).toBeGreaterThanOrEqual(2)
  })

  it('supports undo/redo round trips', async () => {
    const m = await mountEngine({ doc: baseDoc(), selection: ['a', 'b'], controlled: true })
    mounted.push(m)
    expect(m.engine().canUndo()).toBe(false)
    m.engine().align('right')
    m.tick()
    expect(m.engine().canUndo()).toBe(true)
    const aligned = docOf(m)
    m.engine().undo()
    m.tick()
    expect(m.engine().canRedo()).toBe(true)
    expect(docOf(m)).not.toBe(aligned)
    m.engine().redo()
    m.tick()
    expect(docOf(m)).toEqual(aligned)
  })
})
