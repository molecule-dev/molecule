// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import type { WhiteboardChange, WhiteboardCanvasProps } from '../WhiteboardCanvas.js'
import { WhiteboardCanvas } from '../WhiteboardCanvas.js'
import type {
  WhiteboardShape,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardTool,
} from '../types.js'

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

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

/**
 * Stub `getBoundingClientRect` on every Element so jsdom returns a
 * deterministic 800x600 box at origin (0,0). The component derives
 * canvas-space coordinates from these rects, so without a stub it
 * sees zero-sized boxes and every event lands at (0,0).
 */
function stubBoundingRects() {
  const orig = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    return {
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
    } as DOMRect
  }
  return () => {
    Element.prototype.getBoundingClientRect = orig
  }
}

interface HostHandle {
  change: WhiteboardChange | null
}

function makeHost(
  initialTool: WhiteboardTool,
  handle: HostHandle,
  extra?: Partial<WhiteboardCanvasProps>,
) {
  return function Host() {
    const [tool] = useState<WhiteboardTool>(initialTool)
    const [strokes, setStrokes] = useState<WhiteboardStroke[]>([])
    const [shapes, setShapes] = useState<WhiteboardShape[]>([])
    const [stickyNotes, setStickyNotes] = useState<WhiteboardStickyNote[]>([])
    return (
      <WhiteboardCanvas
        tool={tool}
        strokes={strokes}
        shapes={shapes}
        stickyNotes={stickyNotes}
        onChange={(c) => {
          handle.change = c
          setStrokes(c.strokes)
          setShapes(c.shapes)
          setStickyNotes(c.stickyNotes)
        }}
        width={800}
        height={600}
        {...extra}
      />
    )
  }
}

describe('<WhiteboardCanvas>', () => {
  it('renders a labelled tool layer + svg root', () => {
    const handle: HostHandle = { change: null }
    const Host = makeHost('pen', handle)
    const { container } = render(
      <Wrap>
        <Host />
      </Wrap>,
    )
    const layer = container.querySelector('[data-mol-id="whiteboard-canvas-tool-layer"]')
    const svg = container.querySelector('[data-mol-id="whiteboard-canvas-svg"]')
    expect(layer).not.toBeNull()
    expect(svg).not.toBeNull()
    expect(layer?.getAttribute('data-whiteboard-tool')).toBe('pen')
  })

  it('commits a pen stroke when pointer goes down → moves → up', () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    const Host = makeHost('pen', handle)
    try {
      const { container } = render(
        <Wrap>
          <Host />
        </Wrap>,
      )
      const layer = container.querySelector(
        '[data-mol-id="whiteboard-canvas-tool-layer"]',
      ) as HTMLElement
      fireEvent.pointerDown(layer, {
        pointerId: 1,
        button: 0,
        pointerType: 'mouse',
        clientX: 100,
        clientY: 100,
      })
      fireEvent.pointerMove(layer, { pointerId: 1, clientX: 110, clientY: 120 })
      fireEvent.pointerMove(layer, { pointerId: 1, clientX: 130, clientY: 140 })
      fireEvent.pointerUp(layer, { pointerId: 1, clientX: 130, clientY: 140 })
      expect(handle.change).not.toBeNull()
      expect(handle.change!.strokes.length).toBe(1)
      const stroke = handle.change!.strokes[0]
      expect(stroke.kind).toBe('pen')
      // At least three sampled points (down + 2 moves).
      expect(stroke.points.length).toBeGreaterThanOrEqual(3)
    } finally {
      restore()
    }
  })

  it('commits a rect shape with correct bounds when dragged', () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    const Host = makeHost('rect', handle)
    try {
      const { container } = render(
        <Wrap>
          <Host />
        </Wrap>,
      )
      const layer = container.querySelector(
        '[data-mol-id="whiteboard-canvas-tool-layer"]',
      ) as HTMLElement
      fireEvent.pointerDown(layer, {
        pointerId: 1,
        button: 0,
        pointerType: 'mouse',
        clientX: 50,
        clientY: 50,
      })
      fireEvent.pointerMove(layer, { pointerId: 1, clientX: 200, clientY: 150 })
      fireEvent.pointerUp(layer, { pointerId: 1, clientX: 200, clientY: 150 })
      expect(handle.change).not.toBeNull()
      expect(handle.change!.shapes.length).toBe(1)
      const shape = handle.change!.shapes[0]
      expect(shape.kind).toBe('rect')
      expect(shape.from).toEqual({ x: 50, y: 50 })
      expect(shape.to).toEqual({ x: 200, y: 150 })
    } finally {
      restore()
    }
  })

  it('drops zero-size shape gestures (click without drag)', () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    const Host = makeHost('rect', handle)
    try {
      const { container } = render(
        <Wrap>
          <Host />
        </Wrap>,
      )
      const layer = container.querySelector(
        '[data-mol-id="whiteboard-canvas-tool-layer"]',
      ) as HTMLElement
      fireEvent.pointerDown(layer, {
        pointerId: 1,
        button: 0,
        pointerType: 'mouse',
        clientX: 50,
        clientY: 50,
      })
      fireEvent.pointerUp(layer, { pointerId: 1, clientX: 50, clientY: 50 })
      // No drag → zero-size shape → discarded.
      expect(handle.change).toBeNull()
    } finally {
      restore()
    }
  })

  it('places a sticky note on tap (sticky tool)', () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    const Host = makeHost('sticky', handle)
    try {
      const { container } = render(
        <Wrap>
          <Host />
        </Wrap>,
      )
      const layer = container.querySelector(
        '[data-mol-id="whiteboard-canvas-tool-layer"]',
      ) as HTMLElement
      fireEvent.pointerDown(layer, {
        pointerId: 1,
        button: 0,
        pointerType: 'mouse',
        clientX: 200,
        clientY: 200,
      })
      // No move; sticky commits on pointerdown.
      expect(handle.change).not.toBeNull()
      expect(handle.change!.stickyNotes.length).toBe(1)
      const note = handle.change!.stickyNotes[0]
      // Center of the 160x120 default sticky should land near (200,200).
      expect(note.position.x).toBeCloseTo(200 - 80, 0)
      expect(note.position.y).toBeCloseTo(200 - 60, 0)
    } finally {
      restore()
    }
  })

  it('select tool is a no-op for drawing pointers', () => {
    const handle: HostHandle = { change: null }
    const Host = makeHost('select', handle)
    const { container } = render(
      <Wrap>
        <Host />
      </Wrap>,
    )
    const layer = container.querySelector(
      '[data-mol-id="whiteboard-canvas-tool-layer"]',
    ) as HTMLElement
    fireEvent.pointerDown(layer, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerUp(layer, { pointerId: 1, clientX: 100, clientY: 100 })
    expect(handle.change).toBeNull()
  })

  it('readOnly disables every tool', () => {
    const handle: HostHandle = { change: null }
    const Host = makeHost('pen', handle, { readOnly: true })
    const { container } = render(
      <Wrap>
        <Host />
      </Wrap>,
    )
    const layer = container.querySelector(
      '[data-mol-id="whiteboard-canvas-tool-layer"]',
    ) as HTMLElement
    fireEvent.pointerDown(layer, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 50,
      clientY: 50,
    })
    fireEvent.pointerMove(layer, { pointerId: 1, clientX: 80, clientY: 80 })
    fireEvent.pointerUp(layer, { pointerId: 1, clientX: 80, clientY: 80 })
    expect(handle.change).toBeNull()
  })

  it('renders existing strokes / shapes / sticky notes from props', () => {
    const handle: HostHandle = { change: null }
    void handle
    const stroke: WhiteboardStroke = {
      id: 's1',
      kind: 'pen',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: '#000',
      width: 2,
    }
    const shape: WhiteboardShape = {
      id: 'sh1',
      kind: 'rect',
      from: { x: 5, y: 5 },
      to: { x: 25, y: 25 },
      stroke: '#000',
      strokeWidth: 1,
    }
    const note: WhiteboardStickyNote = {
      id: 'n1',
      position: { x: 30, y: 30 },
      width: 100,
      height: 80,
      text: 'hello',
      background: '#fef08a',
      color: '#000',
    }
    const onChange = vi.fn()
    const { container, getByText } = render(
      <Wrap>
        <WhiteboardCanvas
          tool="select"
          strokes={[stroke]}
          shapes={[shape]}
          stickyNotes={[note]}
          onChange={onChange}
          width={400}
          height={300}
        />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="whiteboard-canvas-stroke"]').length).toBe(1)
    expect(container.querySelectorAll('[data-mol-id="whiteboard-canvas-shape"]').length).toBe(1)
    expect(container.querySelectorAll('[data-mol-id="whiteboard-canvas-sticky"]').length).toBe(1)
    expect(getByText('hello')).toBeTruthy()
  })
})
