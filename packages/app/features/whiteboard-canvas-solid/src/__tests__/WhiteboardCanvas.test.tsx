// @vitest-environment jsdom
/**
 * Unit tests for the Solid `WhiteboardCanvas` — a port of
 * `@molecule/app-whiteboard-canvas-react/src/__tests__/WhiteboardCanvas.test.tsx`:
 * the same test names and behavioral assertions, rendered with Solid in jsdom
 * and asserted on the callbacks and markup the component produces.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createSignal } from 'solid-js'

import type {
  WhiteboardShape,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardTool,
} from '../types.js'
import type { WhiteboardCanvasProps, WhiteboardChange } from '../WhiteboardCanvas.jsx'
import { WhiteboardCanvas } from '../WhiteboardCanvas.jsx'
import { cleanup, firePointer, mountView } from './helpers.jsx'

/** The change payload the last gesture produced. */
interface HostHandle {
  change: WhiteboardChange | null
}

afterEach(cleanup)

/**
 * Stub `getBoundingClientRect` on every Element so jsdom returns a
 * deterministic 800x600 box at origin (0,0). The component derives
 * canvas-space coordinates from these rects, so without a stub it
 * sees zero-sized boxes and every event lands at (0,0).
 *
 * @returns A function that restores the original method.
 */
function stubBoundingRects(): () => void {
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

/**
 * Creates a stateful host component wired to a given tool and change handle
 * (React's `makeHost`: the host owns the controlled arrays).
 *
 * @param initialTool - The tool the board starts on.
 * @param handle - Receives the last change payload.
 * @param extra - Extra props for the canvas.
 * @returns The host component.
 */
function makeHost(
  initialTool: WhiteboardTool,
  handle: HostHandle,
  extra?: Partial<WhiteboardCanvasProps>,
) {
  return function Host() {
    const [tool] = createSignal<WhiteboardTool>(initialTool)
    const [strokes, setStrokes] = createSignal<WhiteboardStroke[]>([])
    const [shapes, setShapes] = createSignal<WhiteboardShape[]>([])
    const [stickyNotes, setStickyNotes] = createSignal<WhiteboardStickyNote[]>([])
    return (
      <WhiteboardCanvas
        tool={tool()}
        strokes={strokes()}
        shapes={shapes()}
        stickyNotes={stickyNotes()}
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

/**
 * Finds the tool layer in a mounted host.
 *
 * @param container - The host element.
 * @returns The tool layer.
 */
function toolLayer(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-mol-id="whiteboard-canvas-tool-layer"]') as HTMLElement
}

describe('<WhiteboardCanvas>', () => {
  it('renders a labelled tool layer + svg root', () => {
    const handle: HostHandle = { change: null }
    const container = mountView(() => {
      const Host = makeHost('pen', handle)
      return <Host />
    }) as HTMLElement
    const layer = toolLayer(container)
    const svg = container.querySelector('[data-mol-id="whiteboard-canvas-svg"]')
    expect(layer).not.toBeNull()
    expect(svg).not.toBeNull()
    expect(layer?.getAttribute('data-whiteboard-tool')).toBe('pen')
  })

  it('commits a pen stroke when pointer goes down → moves → up', () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    const container = mountView(() => {
      const Host = makeHost('pen', handle)
      return <Host />
    }) as HTMLElement
    try {
      const layer = toolLayer(container)
      firePointer(layer, 'pointerdown', { clientX: 100, clientY: 100 })
      firePointer(layer, 'pointermove', { clientX: 110, clientY: 120 })
      firePointer(layer, 'pointermove', { clientX: 130, clientY: 140 })
      firePointer(layer, 'pointerup', { clientX: 130, clientY: 140 })
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
    const container = mountView(() => {
      const Host = makeHost('rect', handle)
      return <Host />
    }) as HTMLElement
    try {
      const layer = toolLayer(container)
      firePointer(layer, 'pointerdown', { clientX: 50, clientY: 50 })
      firePointer(layer, 'pointermove', { clientX: 200, clientY: 150 })
      firePointer(layer, 'pointerup', { clientX: 200, clientY: 150 })
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
    const container = mountView(() => {
      const Host = makeHost('rect', handle)
      return <Host />
    }) as HTMLElement
    try {
      const layer = toolLayer(container)
      firePointer(layer, 'pointerdown', { clientX: 50, clientY: 50 })
      firePointer(layer, 'pointerup', { clientX: 50, clientY: 50 })
      // No drag → zero-size shape → discarded.
      expect(handle.change).toBeNull()
    } finally {
      restore()
    }
  })

  it('places a sticky note on tap (sticky tool)', () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    const container = mountView(() => {
      const Host = makeHost('sticky', handle)
      return <Host />
    }) as HTMLElement
    try {
      const layer = toolLayer(container)
      firePointer(layer, 'pointerdown', { clientX: 200, clientY: 200 })
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
    const container = mountView(() => {
      const Host = makeHost('select', handle)
      return <Host />
    }) as HTMLElement
    const layer = toolLayer(container)
    firePointer(layer, 'pointerdown', { clientX: 100, clientY: 100 })
    firePointer(layer, 'pointerup', { clientX: 100, clientY: 100 })
    expect(handle.change).toBeNull()
  })

  it('readOnly disables every tool', () => {
    const handle: HostHandle = { change: null }
    const container = mountView(() => {
      const Host = makeHost('pen', handle, { readOnly: true })
      return <Host />
    }) as HTMLElement
    const layer = toolLayer(container)
    firePointer(layer, 'pointerdown', { clientX: 50, clientY: 50 })
    firePointer(layer, 'pointermove', { clientX: 80, clientY: 80 })
    firePointer(layer, 'pointerup', { clientX: 80, clientY: 80 })
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
    const container = mountView(() => (
      <WhiteboardCanvas
        tool="select"
        strokes={[stroke]}
        shapes={[shape]}
        stickyNotes={[note]}
        onChange={onChange}
        width={400}
        height={300}
      />
    )) as HTMLElement
    expect(container.querySelectorAll('[data-mol-id="whiteboard-canvas-stroke"]').length).toBe(1)
    expect(container.querySelectorAll('[data-mol-id="whiteboard-canvas-shape"]').length).toBe(1)
    expect(container.querySelectorAll('[data-mol-id="whiteboard-canvas-sticky"]').length).toBe(1)
    expect(container.textContent).toContain('hello')
  })
})
