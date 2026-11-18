// @vitest-environment jsdom
/**
 * Unit tests for the Vue `MapDrawing` — a port of
 * `@molecule/app-map-drawing-react/src/__tests__/MapDrawing.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
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
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, nextTick } from 'vue'

import { closeRing, identityBackend, pointInRect } from '../geometry.js'
import { MapDrawing, type MapDrawingProps } from '../MapDrawing.js'
import type { MapShape } from '../types.js'

/** A mounted app and its host element. */
interface Mounted {
  /** The host element the app mounted into. */
  container: HTMLElement
  /** Unmounts the app. */
  unmount: () => void
}

/** The apps mounted by the current test, unmounted after it. */
const apps: Mounted[] = []

/**
 * Mounts a `MapDrawing` with the given props.
 *
 * @param props - Component props.
 * @returns The host element.
 */
function render(props: MapDrawingProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(MapDrawing, props) }))
  app.mount(host)
  apps.push({ container: host, unmount: () => app.unmount() })
  return host
}

/**
 * Renders the component with only its required change callback.
 *
 * @param onChange - The change callback.
 * @returns The host element.
 */
function renderDefault(onChange: (shapes: MapShape[]) => void): HTMLElement {
  return render({ onChange })
}

/**
 * Stub the surface element's bounding rect so client coords map cleanly onto
 * our synthetic 200x200 surface.
 *
 * @param container - Render container.
 */
function stubSurfaceRect(container: HTMLElement): void {
  const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
  surface.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

/**
 * Dispatch a pointer event carrying viewport coordinates.
 *
 * @param target - Element to dispatch on.
 * @param type - Event type.
 * @param x - Viewport X.
 * @param y - Viewport Y.
 */
function dispatchPointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    clientX: number
    clientY: number
    pointerId: number
    button: number
  }
  event.clientX = x
  event.clientY = y
  event.pointerId = 1
  event.button = 0
  target.dispatchEvent(event)
}

/**
 * Dispatch a double-click on the surface.
 *
 * @param target - Element to dispatch on.
 */
function doubleClick(target: Element): void {
  target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
}

/**
 * The surface element of a render.
 *
 * @param container - Render container.
 * @returns The surface element.
 */
function surfaceOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
}

afterEach(() => {
  for (const app of apps.splice(0)) {
    app.unmount()
    app.container.remove()
  }
  document.body.innerHTML = ''
})

describe('closeRing', () => {
  it('returns null for fewer than three vertices', () => {
    expect(closeRing([])).toBeNull()
    expect(closeRing([[0, 0]])).toBeNull()
    expect(
      closeRing([
        [0, 0],
        [1, 1],
      ]),
    ).toBeNull()
  })

  it('repeats the first vertex when the ring is open', () => {
    const ring = closeRing([
      [0, 0],
      [1, 0],
      [1, 1],
    ])
    expect(ring).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ])
  })

  it('leaves an already-closed ring untouched', () => {
    const ring = closeRing([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ])
    expect(ring).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ])
  })
})

describe('pointInRect', () => {
  it('returns true for points inside the rect (any corner orientation)', () => {
    expect(pointInRect({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 })).toBe(true)
    expect(pointInRect({ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 0, y: 0 })).toBe(true)
  })
  it('returns false for points outside the rect', () => {
    expect(pointInRect({ x: 11, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 })).toBe(false)
  })
  it('treats edges as inclusive', () => {
    expect(pointInRect({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 10 })).toBe(true)
  })
})

describe('identityBackend', () => {
  it('round-trips coordinates through project/unproject', () => {
    const projected = identityBackend.project([3, 4])
    expect(projected).toEqual({ x: 3, y: 4 })
    expect(identityBackend.unproject(projected)).toEqual([3, 4])
  })
  it('measures Euclidean distance', () => {
    expect(identityBackend.distanceMeters([0, 0], [3, 4])).toBe(5)
  })
})

describe('<MapDrawing> tool switching', () => {
  it('renders one toolbar button per tool plus select, cancel draft and delete', () => {
    const container = renderDefault(() => {})
    expect(container.querySelector('[data-mol-id="map-drawing-tool-polygon"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-circle"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-pin"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-line"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-select"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-cancel-draft"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-delete"]')).not.toBeNull()
  })

  it('marks the active tool with aria-pressed=true and exposes data-active-tool', async () => {
    const container = renderDefault(() => {})
    expect(surfaceOf(container).getAttribute('data-active-tool')).toBe('polygon')
    ;(
      container.querySelector('[data-mol-id="map-drawing-tool-circle"]') as HTMLButtonElement
    ).click()
    await nextTick()
    expect(surfaceOf(container).getAttribute('data-active-tool')).toBe('circle')
  })

  it('routes external onActiveToolChange callbacks', async () => {
    const onActiveToolChange = vi.fn()
    const container = render({
      onChange: () => {},
      activeTool: 'pin',
      onActiveToolChange,
    })
    ;(container.querySelector('[data-mol-id="map-drawing-tool-line"]') as HTMLButtonElement).click()
    await nextTick()
    expect(onActiveToolChange).toHaveBeenCalledWith('line')
  })

  it('honors the tools prop ordering and excludes hidden tools', () => {
    const container = render({ onChange: () => {}, tools: ['pin', 'polygon'] })
    expect(container.querySelector('[data-mol-id="map-drawing-tool-circle"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-line"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-pin"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-polygon"]')).not.toBeNull()
  })
})

describe('<MapDrawing> polygon vertex appending', () => {
  it('appends a vertex per pointer-down and finalises on double-click', async () => {
    const onChange = vi.fn()
    const container = renderDefault(onChange)
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await nextTick()
    dispatchPointer(surface, 'pointerdown', 100, 10)
    dispatchPointer(surface, 'pointerup', 100, 10)
    await nextTick()
    dispatchPointer(surface, 'pointerdown', 100, 100)
    dispatchPointer(surface, 'pointerup', 100, 100)
    await nextTick()

    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
    expect(onChange).not.toHaveBeenCalled()

    doubleClick(surface)
    await nextTick()
    expect(onChange).toHaveBeenCalledTimes(1)
    const shapes = onChange.mock.calls[0][0] as MapShape[]
    expect(shapes).toHaveLength(1)
    expect(shapes[0].kind).toBe('polygon')
    expect(shapes[0].geometry.type).toBe('Polygon')
    if (shapes[0].geometry.type === 'Polygon') {
      const ring = shapes[0].geometry.coordinates[0]
      expect(ring).toHaveLength(4)
      expect(ring[0]).toEqual([10, 10])
      expect(ring[ring.length - 1]).toEqual(ring[0])
    }
  })

  it('skips finalisation when a polygon has fewer than three vertices', async () => {
    const onChange = vi.fn()
    const container = renderDefault(onChange)
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await nextTick()
    dispatchPointer(surface, 'pointerdown', 100, 10)
    dispatchPointer(surface, 'pointerup', 100, 10)
    await nextTick()
    doubleClick(surface)
    await nextTick()

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('<MapDrawing> circle radius', () => {
  it('commits a circle on pointer-up with the great-circle radius from drag distance', async () => {
    const onChange = vi.fn()
    const container = render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 50, 50)
    await nextTick()
    dispatchPointer(surface, 'pointermove', 80, 90)
    await nextTick()
    dispatchPointer(surface, 'pointerup', 80, 90)
    await nextTick()

    expect(onChange).toHaveBeenCalledTimes(1)
    const shapes = onChange.mock.calls[0][0] as MapShape[]
    expect(shapes).toHaveLength(1)
    expect(shapes[0].kind).toBe('circle')
    expect(shapes[0].geometry.type).toBe('Point')
    if (shapes[0].geometry.type === 'Point') {
      expect(shapes[0].geometry.coordinates).toEqual([50, 50])
    }
    expect(shapes[0].properties?.radiusMeters).toBe(50)
  })

  it('does not commit a zero-radius circle (no drag)', async () => {
    const onChange = vi.fn()
    const container = render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 50, 50)
    await nextTick()
    dispatchPointer(surface, 'pointerup', 50, 50)
    await nextTick()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('<MapDrawing> pin placement', () => {
  it('adds one pin per pointer-down', async () => {
    const onChange = vi.fn()
    const container = render({ onChange, activeTool: 'pin' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 10, 20)
    dispatchPointer(surface, 'pointerup', 10, 20)
    await nextTick()
    dispatchPointer(surface, 'pointerdown', 30, 40)
    dispatchPointer(surface, 'pointerup', 30, 40)
    await nextTick()

    expect(onChange).toHaveBeenCalledTimes(2)
    const final = onChange.mock.calls[1][0] as MapShape[]
    expect(final).toHaveLength(2)
    expect(final[0].kind).toBe('pin')
    expect(final[1].kind).toBe('pin')
    expect(final[0].geometry).toEqual({ type: 'Point', coordinates: [10, 20] })
    expect(final[1].geometry).toEqual({ type: 'Point', coordinates: [30, 40] })
  })
})

describe('<MapDrawing> delete-selected', () => {
  const seedShapes: MapShape[] = [
    { id: 'a', kind: 'pin', geometry: { type: 'Point', coordinates: [10, 10] } },
    { id: 'b', kind: 'pin', geometry: { type: 'Point', coordinates: [50, 50] } },
    { id: 'c', kind: 'pin', geometry: { type: 'Point', coordinates: [150, 150] } },
  ]

  it('selects shapes whose anchor lies inside the marquee and deletes them via the toolbar delete button', async () => {
    const onChange = vi.fn()
    const container = render({
      initialShapes: seedShapes,
      onChange,
      activeTool: 'select',
    })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 0, 0)
    await nextTick()
    dispatchPointer(surface, 'pointermove', 80, 80)
    await nextTick()
    dispatchPointer(surface, 'pointerup', 80, 80)
    await nextTick()

    const deleteBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-delete"]',
    ) as HTMLButtonElement
    expect(deleteBtn.disabled).toBe(false)
    expect(deleteBtn.tagName).toBe('BUTTON')
    deleteBtn.click()
    await nextTick()

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as MapShape[]
    expect(next.map((s) => s.id)).toEqual(['c'])
  })

  it('disables the delete button when no shapes are selected', () => {
    const container = render({
      initialShapes: seedShapes,
      onChange: () => {},
      activeTool: 'select',
    })
    const deleteBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-delete"]',
    ) as HTMLButtonElement
    expect(deleteBtn.disabled).toBe(true)
  })
})

describe('<MapDrawing> cancel draft', () => {
  it('disables the cancel-draft button when no draft is in progress', () => {
    const container = renderDefault(() => {})
    const cancelBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-cancel-draft"]',
    ) as HTMLButtonElement
    expect(cancelBtn.tagName).toBe('BUTTON')
    expect(cancelBtn.disabled).toBe(true)
    expect(cancelBtn.getAttribute('aria-disabled')).toBe('true')
  })

  it('discards an in-progress polygon draft without committing', async () => {
    const onChange = vi.fn()
    const container = renderDefault(onChange)
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await nextTick()
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    const cancelBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-cancel-draft"]',
    ) as HTMLButtonElement
    expect(cancelBtn.disabled).toBe(false)

    cancelBtn.click()
    await nextTick()
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
    expect(cancelBtn.disabled).toBe(true)
  })

  it('discards an in-progress circle drag without committing', async () => {
    const onChange = vi.fn()
    const container = render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 50, 50)
    await nextTick()
    expect(container.querySelector('[data-mol-id="map-drawing-draft-circle"]')).not.toBeNull()

    const cancelBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-cancel-draft"]',
    ) as HTMLButtonElement
    expect(cancelBtn.disabled).toBe(false)

    cancelBtn.click()
    await nextTick()
    expect(container.querySelector('[data-mol-id="map-drawing-draft-circle"]')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
    expect(cancelBtn.disabled).toBe(true)
  })
})

describe('<MapDrawing> line drawing', () => {
  it('finalises a polyline on double-click with the accumulated vertices', async () => {
    const onChange = vi.fn()
    const container = render({ onChange, activeTool: 'line' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    dispatchPointer(surface, 'pointerdown', 0, 0)
    dispatchPointer(surface, 'pointerup', 0, 0)
    await nextTick()
    dispatchPointer(surface, 'pointerdown', 50, 50)
    dispatchPointer(surface, 'pointerup', 50, 50)
    await nextTick()
    doubleClick(surface)
    await nextTick()

    expect(onChange).toHaveBeenCalledTimes(1)
    const shapes = onChange.mock.calls[0][0] as MapShape[]
    expect(shapes[0].kind).toBe('line')
    expect(shapes[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [
        [0, 0],
        [50, 50],
      ],
    })
  })
})
