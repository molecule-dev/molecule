// @vitest-environment jsdom

import { act, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { closeRing, identityBackend, pointInRect } from '../geometry.js'
import { MapDrawing } from '../MapDrawing.js'
import type { MapShape } from '../types.js'

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
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Stub the surface element's bounding rect so client coords map cleanly
 * onto our synthetic 200x200 surface.
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

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
  it('renders one toolbar button per tool plus select + delete', () => {
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="map-drawing-tool-polygon"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-circle"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-pin"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-line"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-select"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-delete"]')).not.toBeNull()
  })

  it('marks the active tool with aria-pressed=true and exposes data-active-tool', () => {
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={() => {}} />
      </Wrap>,
    )
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
    expect(surface.getAttribute('data-active-tool')).toBe('polygon')
    fireEvent.click(container.querySelector('[data-mol-id="map-drawing-tool-circle"]')!)
    expect(surface.getAttribute('data-active-tool')).toBe('circle')
  })

  it('routes external onActiveToolChange callbacks', () => {
    const onActiveToolChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={() => {}} activeTool="pin" onActiveToolChange={onActiveToolChange} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="map-drawing-tool-line"]')!)
    expect(onActiveToolChange).toHaveBeenCalledWith('line')
  })

  it('honors the tools prop ordering and excludes hidden tools', () => {
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={() => {}} tools={['pin', 'polygon']} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="map-drawing-tool-circle"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-line"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-pin"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="map-drawing-tool-polygon"]')).not.toBeNull()
  })
})

describe('<MapDrawing> polygon vertex appending', () => {
  it('appends a vertex per pointer-down and finalises on double-click', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={onChange} />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 10 })
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 10 })
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 10 })
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100 })
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 100 })

    // Three vertex draft should be visible before finalising.
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.doubleClick(surface, { clientX: 100, clientY: 100 })
    expect(onChange).toHaveBeenCalledTimes(1)
    const shapes = onChange.mock.calls[0][0] as MapShape[]
    expect(shapes).toHaveLength(1)
    expect(shapes[0].kind).toBe('polygon')
    expect(shapes[0].geometry.type).toBe('Polygon')
    if (shapes[0].geometry.type === 'Polygon') {
      const ring = shapes[0].geometry.coordinates[0]
      // 3 input vertices + closing vertex = 4 entries.
      expect(ring).toHaveLength(4)
      expect(ring[0]).toEqual([10, 10])
      expect(ring[ring.length - 1]).toEqual(ring[0])
    }
  })

  it('skips finalisation when a polygon has fewer than three vertices', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={onChange} />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 10 })
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 10 })
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 10 })
    fireEvent.doubleClick(surface, { clientX: 100, clientY: 10 })

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('<MapDrawing> circle radius', () => {
  it('commits a circle on pointer-up with the great-circle radius from drag distance', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={onChange} activeTool="circle" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 50, clientY: 50 })
    fireEvent.pointerMove(surface, { clientX: 80, clientY: 90 })
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 90 })

    expect(onChange).toHaveBeenCalledTimes(1)
    const shapes = onChange.mock.calls[0][0] as MapShape[]
    expect(shapes).toHaveLength(1)
    expect(shapes[0].kind).toBe('circle')
    expect(shapes[0].geometry.type).toBe('Point')
    if (shapes[0].geometry.type === 'Point') {
      expect(shapes[0].geometry.coordinates).toEqual([50, 50])
    }
    // identity backend uses Euclidean pixels — sqrt(30^2 + 40^2) === 50.
    expect(shapes[0].properties?.radiusMeters).toBe(50)
  })

  it('does not commit a zero-radius circle (no drag)', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={onChange} activeTool="circle" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 50, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 50, clientY: 50 })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('<MapDrawing> pin placement', () => {
  it('adds one pin per pointer-down', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={onChange} activeTool="pin" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 10, clientY: 20 })
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 20 })
    fireEvent.pointerDown(surface, { clientX: 30, clientY: 40 })
    fireEvent.pointerUp(surface, { clientX: 30, clientY: 40 })

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

  it('selects shapes whose anchor lies inside the marquee and deletes them via Delete key', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing initialShapes={seedShapes} onChange={onChange} activeTool="select" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    // Marquee covers shapes a + b (coords (10,10) and (50,50)) but not c.
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(surface, { clientX: 80, clientY: 80 })
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 80 })

    // Delete button should now be enabled.
    const deleteBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-delete"]',
    ) as HTMLButtonElement
    expect(deleteBtn.disabled).toBe(false)

    act(() => {
      fireEvent.keyDown(surface, { key: 'Delete' })
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as MapShape[]
    expect(next.map((s) => s.id)).toEqual(['c'])
  })

  it('deletes the selection when the toolbar delete button is clicked', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing initialShapes={seedShapes} onChange={onChange} activeTool="select" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(surface, { clientX: 80, clientY: 80 })
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 80 })

    const deleteBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-delete"]',
    ) as HTMLButtonElement
    fireEvent.click(deleteBtn)

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as MapShape[]
    expect(next.map((s) => s.id)).toEqual(['c'])
  })

  it('disables the delete button when no shapes are selected', () => {
    const { container } = render(
      <Wrap>
        <MapDrawing initialShapes={seedShapes} onChange={() => {}} activeTool="select" />
      </Wrap>,
    )
    const deleteBtn = container.querySelector(
      '[data-mol-id="map-drawing-tool-delete"]',
    ) as HTMLButtonElement
    expect(deleteBtn.disabled).toBe(true)
  })
})

describe('<MapDrawing> line drawing', () => {
  it('finalises a polyline on double-click with the accumulated vertices', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <MapDrawing onChange={onChange} activeTool="line" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement

    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(surface, { clientX: 0, clientY: 0 })
    fireEvent.pointerDown(surface, { clientX: 50, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 50, clientY: 50 })
    fireEvent.doubleClick(surface, { clientX: 50, clientY: 50 })

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
