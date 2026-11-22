// @vitest-environment jsdom
/**
 * Unit tests for the Angular `WhiteboardCanvas` — a port of
 * `@molecule/app-whiteboard-canvas-react/src/__tests__/WhiteboardCanvas.test.tsx`:
 * the same test names and behavioral assertions, mounted through Angular's real
 * renderer and asserted on the callbacks and markup the component produces.
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type {
  WhiteboardCanvasProps,
  WhiteboardChange,
  WhiteboardShape,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardTool,
} from '../types.js'
import { mountCanvas, type Mounted, pointer } from './helpers.js'

/** The change payload the last gesture produced. */
interface HostHandle {
  change: WhiteboardChange | null
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

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
 * Mounts the canvas with the props React's `makeHost` gives it (the host owns
 * the controlled arrays, so a committed gesture feeds back through them).
 *
 * @param initialTool - The tool the board starts on.
 * @param handle - Receives the last change payload.
 * @param extra - Extra props for the canvas.
 * @returns The mounted host.
 */
async function makeHost(
  initialTool: WhiteboardTool,
  handle: HostHandle,
  extra?: Partial<WhiteboardCanvasProps>,
): Promise<Mounted> {
  const props: Record<string, unknown> = {
    tool: initialTool,
    strokes: [],
    shapes: [],
    stickyNotes: [],
    width: 800,
    height: 600,
    ...extra,
    onChange: (c: WhiteboardChange): void => {
      handle.change = c
      void m.setProps({ strokes: c.strokes, shapes: c.shapes, stickyNotes: c.stickyNotes })
    },
  }
  const m = await mountCanvas(props)
  mounted.push(m)
  return m
}

/**
 * Finds the tool layer in a mounted host.
 *
 * @param m - The mounted host.
 * @returns The tool layer.
 */
function toolLayer(m: Mounted): HTMLElement {
  return m.host.querySelector('[data-mol-id="whiteboard-canvas-tool-layer"]') as HTMLElement
}

describe('<WhiteboardCanvas>', () => {
  it('renders a labelled tool layer + svg root', async () => {
    const handle: HostHandle = { change: null }
    const m = await makeHost('pen', handle)
    const layer = toolLayer(m)
    const svg = m.host.querySelector('[data-mol-id="whiteboard-canvas-svg"]')
    expect(layer).not.toBeNull()
    expect(svg).not.toBeNull()
    expect(layer?.getAttribute('data-whiteboard-tool')).toBe('pen')
  })

  it('commits a pen stroke when pointer goes down → moves → up', async () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    try {
      const m = await makeHost('pen', handle)
      const layer = toolLayer(m)
      pointer(layer, 'pointerdown', 100, 100)
      pointer(layer, 'pointermove', 110, 120)
      pointer(layer, 'pointermove', 130, 140)
      pointer(layer, 'pointerup', 130, 140)
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

  it('commits a rect shape with correct bounds when dragged', async () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    try {
      const m = await makeHost('rect', handle)
      const layer = toolLayer(m)
      pointer(layer, 'pointerdown', 50, 50)
      pointer(layer, 'pointermove', 200, 150)
      pointer(layer, 'pointerup', 200, 150)
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

  it('drops zero-size shape gestures (click without drag)', async () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    try {
      const m = await makeHost('rect', handle)
      const layer = toolLayer(m)
      pointer(layer, 'pointerdown', 50, 50)
      pointer(layer, 'pointerup', 50, 50)
      // No drag → zero-size shape → discarded.
      expect(handle.change).toBeNull()
    } finally {
      restore()
    }
  })

  it('places a sticky note on tap (sticky tool)', async () => {
    const restore = stubBoundingRects()
    const handle: HostHandle = { change: null }
    try {
      const m = await makeHost('sticky', handle)
      const layer = toolLayer(m)
      pointer(layer, 'pointerdown', 200, 200)
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

  it('select tool is a no-op for drawing pointers', async () => {
    const handle: HostHandle = { change: null }
    const m = await makeHost('select', handle)
    const layer = toolLayer(m)
    pointer(layer, 'pointerdown', 100, 100)
    pointer(layer, 'pointerup', 100, 100)
    expect(handle.change).toBeNull()
  })

  it('readOnly disables every tool', async () => {
    const handle: HostHandle = { change: null }
    const m = await makeHost('pen', handle, { readOnly: true })
    const layer = toolLayer(m)
    pointer(layer, 'pointerdown', 50, 50)
    pointer(layer, 'pointermove', 80, 80)
    pointer(layer, 'pointerup', 80, 80)
    expect(handle.change).toBeNull()
  })

  it('renders existing strokes / shapes / sticky notes from props', async () => {
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
    const m = await mountCanvas({
      tool: 'select',
      strokes: [stroke],
      shapes: [shape],
      stickyNotes: [note],
      onChange,
      width: 400,
      height: 300,
    })
    mounted.push(m)
    const host = m.host
    expect(host.querySelectorAll('[data-mol-id="whiteboard-canvas-stroke"]').length).toBe(1)
    expect(host.querySelectorAll('[data-mol-id="whiteboard-canvas-shape"]').length).toBe(1)
    expect(host.querySelectorAll('[data-mol-id="whiteboard-canvas-sticky"]').length).toBe(1)
    expect(host.textContent).toContain('hello')
  })
})
