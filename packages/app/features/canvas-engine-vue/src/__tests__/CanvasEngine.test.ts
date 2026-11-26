// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CanvasEngine` — a port of
 * `@molecule/app-canvas-engine-react/src/__tests__/CanvasEngine.test.tsx`: the
 * same test names and behavioural assertions, rendered with Vue in jsdom and
 * asserted on the imperative handle and the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { nextTick } from 'vue'

import { CanvasEngine } from '../CanvasEngine.js'
import type { CanvasDocument, VectorElement } from '../types.js'
import { type MountedEngine, mountEngine } from './helpers.js'

const mounted: MountedEngine[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
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

describe('<CanvasEngine>', () => {
  it('renders a labelled root and one SVG element per layer', () => {
    const m = mountEngine(CanvasEngine, { doc: baseDoc() })
    mounted.push(m)
    const root = m.container.querySelector('[data-mol-id="canvas-engine"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('data-canvas-engine-snap')).toBe('true')
    const surface = m.container.querySelector('[data-mol-id="canvas-surface"]')
    expect(surface?.getAttribute('aria-label')).toBe('Vector canvas editor')
    const svg = m.container.querySelector('[data-mol-id="canvas-engine-svg"]')
    expect(svg).not.toBeNull()
    const elements = m.container.querySelectorAll('[data-mol-id="canvas-engine-element"]')
    expect(elements.length).toBe(3)
  })

  it('renders rect, ellipse, line, path, text, and group kinds', () => {
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
    const m = mountEngine(CanvasEngine, { doc: { width: 100, height: 100, layers } })
    mounted.push(m)
    expect(m.container.querySelector('rect')).not.toBeNull()
    expect(m.container.querySelector('ellipse')).not.toBeNull()
    expect(m.container.querySelector('line')).not.toBeNull()
    expect(m.container.querySelector('path')).not.toBeNull()
    expect(m.container.querySelector('text')?.textContent).toBe('hi')
  })

  it('toggles snap-to-grid via data attribute', async () => {
    const m = mountEngine(CanvasEngine, {
      doc: baseDoc(),
      props: { snapToGrid: false },
    })
    mounted.push(m)
    expect(
      m.container
        .querySelector('[data-mol-id="canvas-engine"]')
        ?.getAttribute('data-canvas-engine-snap'),
    ).toBe('false')
    await m.rerender({ snapToGrid: true })
    expect(
      m.container
        .querySelector('[data-mol-id="canvas-engine"]')
        ?.getAttribute('data-canvas-engine-snap'),
    ).toBe('true')
  })

  it('exposes alignment via the imperative handle', async () => {
    const m = mountEngine(CanvasEngine, {
      doc: baseDoc(),
      selection: ['a', 'b'],
      controlled: true,
    })
    mounted.push(m)
    m.engine.value!.align('left')
    await nextTick()
    const a = m.doc.value.layers.find((l) => l.id === 'a') as Extract<
      VectorElement,
      { kind: 'rect' }
    >
    const b = m.doc.value.layers.find((l) => l.id === 'b') as Extract<
      VectorElement,
      { kind: 'ellipse' }
    >
    expect(a.x).toBe(0)
    expect(b.x).toBe(0)
  })

  it('groups and ungroups via the imperative handle', async () => {
    const m = mountEngine(CanvasEngine, {
      doc: baseDoc(),
      selection: ['a', 'b'],
      controlled: true,
    })
    mounted.push(m)
    m.engine.value!.group()
    await nextTick()
    const groups = m.doc.value.layers.filter((l) => l.kind === 'group')
    expect(groups.length).toBe(1)
    expect(groups[0]!.children.length).toBe(2)
    expect(m.selection.value.length).toBe(1)

    // Ungroup the new group.
    m.engine.value!.ungroup()
    await nextTick()
    expect(m.doc.value.layers.filter((l) => l.kind === 'group').length).toBe(0)
    expect(m.doc.value.layers.length).toBeGreaterThanOrEqual(2)
  })

  it('supports undo/redo round trips', async () => {
    const m = mountEngine(CanvasEngine, {
      doc: baseDoc(),
      selection: ['a', 'b'],
      controlled: true,
    })
    mounted.push(m)
    expect(m.engine.value!.canUndo()).toBe(false)
    m.engine.value!.align('right')
    await nextTick()
    expect(m.engine.value!.canUndo()).toBe(true)
    const aligned = m.doc.value
    m.engine.value!.undo()
    await nextTick()
    expect(m.engine.value!.canRedo()).toBe(true)
    expect(m.doc.value).not.toBe(aligned)
    m.engine.value!.redo()
    await nextTick()
    expect(m.doc.value).toEqual(aligned)
  })
})
