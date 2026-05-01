// @vitest-environment jsdom

import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { createRef } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { CanvasEngine } from '../CanvasEngine.js'
import type { CanvasDocument, CanvasEngineHandle, VectorElement } from '../types.js'

/** Build a UIClassMap stub via Proxy. */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_tt, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

const baseDoc = (): CanvasDocument => ({
  width: 800,
  height: 600,
  layers: [
    { id: 'a', kind: 'rect', x: 0, y: 0, width: 100, height: 100, fill: '#ff0000' },
    { id: 'b', kind: 'ellipse', x: 200, y: 200, width: 80, height: 60, fill: '#00ff00' },
    { id: 'c', kind: 'line', x1: 0, y1: 400, x2: 200, y2: 500, stroke: '#0000ff' },
  ],
})

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<CanvasEngine>', () => {
  it('renders a labelled root and one SVG element per layer', () => {
    const { container } = render(
      <Wrap>
        <CanvasEngine document={baseDoc()} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="canvas-engine"]')
    expect(root).not.toBeNull()
    const svg = container.querySelector('[data-mol-id="canvas-engine-svg"]')
    expect(svg).not.toBeNull()
    const elements = container.querySelectorAll('[data-mol-id="canvas-engine-element"]')
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
    const { container } = render(
      <Wrap>
        <CanvasEngine document={{ width: 100, height: 100, layers }} />
      </Wrap>,
    )
    expect(container.querySelector('rect')).not.toBeNull()
    expect(container.querySelector('ellipse')).not.toBeNull()
    expect(container.querySelector('line')).not.toBeNull()
    expect(container.querySelector('path')).not.toBeNull()
    expect(container.querySelector('text')?.textContent).toBe('hi')
  })

  it('toggles snap-to-grid via data attribute', () => {
    const { container, rerender } = render(
      <Wrap>
        <CanvasEngine document={baseDoc()} snapToGrid={false} />
      </Wrap>,
    )
    expect(
      container
        .querySelector('[data-mol-id="canvas-engine"]')
        ?.getAttribute('data-canvas-engine-snap'),
    ).toBe('false')
    rerender(
      <Wrap>
        <CanvasEngine document={baseDoc()} snapToGrid />
      </Wrap>,
    )
    expect(
      container
        .querySelector('[data-mol-id="canvas-engine"]')
        ?.getAttribute('data-canvas-engine-snap'),
    ).toBe('true')
  })

  it('exposes alignment via the imperative handle', () => {
    const ref = createRef<CanvasEngineHandle>()
    let current = baseDoc()
    const onChange = (next: CanvasDocument) => {
      current = next
    }
    render(
      <Wrap>
        <CanvasEngine
          ref={ref}
          document={current}
          onChange={onChange}
          selection={['a', 'b']}
          onSelectionChange={() => {}}
        />
      </Wrap>,
    )
    act(() => {
      ref.current!.align('left')
    })
    const a = current.layers.find((l) => l.id === 'a') as Extract<VectorElement, { kind: 'rect' }>
    const b = current.layers.find((l) => l.id === 'b') as Extract<
      VectorElement,
      { kind: 'ellipse' }
    >
    expect(a.x).toBe(0)
    expect(b.x).toBe(0)
  })

  it('groups and ungroups via the imperative handle', () => {
    const ref = createRef<CanvasEngineHandle>()
    let doc = baseDoc()
    let sel: readonly string[] = ['a', 'b']
    const setSel = (next: readonly string[]) => {
      sel = next
    }
    const Host = () => (
      <CanvasEngine
        ref={ref}
        document={doc}
        onChange={(d) => {
          doc = d
        }}
        selection={sel}
        onSelectionChange={setSel}
      />
    )
    const { rerender } = render(
      <Wrap>
        <Host />
      </Wrap>,
    )
    act(() => {
      ref.current!.group()
    })
    rerender(
      <Wrap>
        <Host />
      </Wrap>,
    )
    const groups = doc.layers.filter((l) => l.kind === 'group')
    expect(groups.length).toBe(1)
    expect(groups[0]!.children.length).toBe(2)
    expect(sel.length).toBe(1)

    // Ungroup the new group.
    act(() => {
      ref.current!.ungroup()
    })
    rerender(
      <Wrap>
        <Host />
      </Wrap>,
    )
    expect(doc.layers.filter((l) => l.kind === 'group').length).toBe(0)
    expect(doc.layers.length).toBeGreaterThanOrEqual(2)
  })

  it('supports undo/redo round trips', () => {
    const ref = createRef<CanvasEngineHandle>()
    let doc = baseDoc()
    const Host = () => (
      <CanvasEngine
        ref={ref}
        document={doc}
        onChange={(d) => {
          doc = d
        }}
        selection={['a', 'b']}
        onSelectionChange={() => {}}
      />
    )
    const { rerender } = render(
      <Wrap>
        <Host />
      </Wrap>,
    )
    expect(ref.current!.canUndo()).toBe(false)
    act(() => {
      ref.current!.align('right')
    })
    rerender(
      <Wrap>
        <Host />
      </Wrap>,
    )
    expect(ref.current!.canUndo()).toBe(true)
    const aligned = doc
    act(() => {
      ref.current!.undo()
    })
    rerender(
      <Wrap>
        <Host />
      </Wrap>,
    )
    expect(ref.current!.canRedo()).toBe(true)
    expect(doc).not.toBe(aligned)
    act(() => {
      ref.current!.redo()
    })
    rerender(
      <Wrap>
        <Host />
      </Wrap>,
    )
    expect(doc).toEqual(aligned)
  })
})
