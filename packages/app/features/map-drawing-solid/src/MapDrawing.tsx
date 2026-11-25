/**
 * Solid map-drawing surface: a drawing toolbar over an interaction layer that
 * authors geofence shapes (polygons, circles, pins, lines).
 *
 * Solid counterpart of `@molecule/app-map-drawing-react`'s `MapDrawing` — the
 * same props (React names), the same ClassMap classes and inline styles, the
 * same SVG overlay, the same pointer semantics, and the same callback calls.
 *
 * @module
 */

import { type Component, createEffect, createSignal, type JSX, Show } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { type ElementDrag, type ElementDragPoint, getClassMap } from '@molecule/app-ui'
import { webDrag } from '@molecule/app-ui-solid'

import { closeRing, identityBackend, pointInRect } from './geometry.js'
import { MapDrawingToolbar } from './MapDrawingToolbar.jsx'
import type {
  ActiveTool,
  DrawingTool,
  GeoJsonGeometry,
  GeoJsonLineString,
  GeoJsonPoint,
  GeoJsonPolygon,
  MapDrawingBackend,
  MapShape,
  ScreenPoint,
  ShapeSelection,
} from './types.js'

/** Default drawing tools shown in the toolbar. */
const DEFAULT_TOOLS: DrawingTool[] = ['polygon', 'circle', 'pin', 'line']

/**
 * Stable id generator. Falls back to `Math.random()` so the component
 * works in environments without `crypto.randomUUID` (older Node test
 * runners, embedded WebViews).
 *
 * @returns A reasonably unique string id.
 */
function makeShapeId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }
  return `shape-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

/** Ephemeral in-progress polygon / line draft. */
interface DraftPath {
  /** Vertices accumulated so far, in `[lng, lat]` order. */
  vertices: [number, number][]
  /** Whether the draft is for a polygon or a line. */
  kind: 'polygon' | 'line'
}

/** Ephemeral in-progress circle drag. */
interface DraftCircle {
  /** Circle center in `[lng, lat]` order. */
  center: [number, number]
  /** Current pointer position in `[lng, lat]` order — used to compute live radius. */
  pointer: [number, number]
}

/** Ephemeral selection-rectangle drag. */
interface DraftSelection {
  /** Drag start point, in screen-space pixels. */
  start: ScreenPoint
  /** Current drag point, in screen-space pixels. */
  current: ScreenPoint
}

/** MapDrawing component props. */
export interface MapDrawingProps {
  /** Initial shapes to seed the surface with. */
  initialShapes?: MapShape[]
  /** Called whenever the shape list changes (add / edit / delete). */
  onChange: (shapes: MapShape[]) => void
  /** Drawing tools to expose. Defaults to the four built-in tools. */
  tools?: DrawingTool[]
  /** Externally controlled active tool. When omitted, the component manages tool state internally. */
  activeTool?: ActiveTool
  /** Called when the active tool changes (drives the toolbar regardless of internal/external state). */
  onActiveToolChange?: (tool: ActiveTool) => void
  /**
   * Map backend used to project between geographic and screen coordinates.
   * Defaults to an identity backend that treats `lng → x`, `lat → y` so
   * the component can be exercised in tests without a real map provider.
   */
  mapBackend?: MapDrawingBackend
  /** Optional content for the map background (e.g. a `<MapView />`). */
  mapSlot?: JSX.Element
  /** Width of the surface (CSS) — defaults to `100%`. */
  width?: number | string
  /** Height of the surface (CSS) — defaults to `400`. */
  height?: number | string
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Map-drawing surface for geofence editing. Renders a toolbar plus an
 * interaction layer overlaid on top of the (optional) map slot. The
 * component handles four drawing tools — polygon, circle, pin, line —
 * plus a select / delete action group.
 *
 * Drawing semantics:
 * - **polygon / line**: click adds vertices; double-click finalises.
 * - **circle**: pointer-down sets the center; pointer-up commits with
 *   radius equal to the great-circle distance from center to release.
 * - **pin**: each pointer-down adds one new pin shape.
 * - **select**: pointer-drag draws a marquee; any shape whose anchor
 *   point lies inside the marquee is added to the selection.
 *
 * The surface follows its pointer contact wherever the pointer goes, inside
 * or outside the surface, and commits at the release position. A contact that
 * is interrupted (the pointer cancelled, the window losing focus) discards the
 * circle or marquee it was drawing; path vertices stay.
 *
 * @param props - Component props (see {@link MapDrawingProps}).
 * @returns The rendered map-drawing surface.
 */
export const MapDrawing: Component<MapDrawingProps> = (props): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const tools = (): DrawingTool[] => props.tools ?? DEFAULT_TOOLS
  const backend = (): MapDrawingBackend => props.mapBackend ?? identityBackend

  const [shapes, setShapes] = createSignal<MapShape[]>(props.initialShapes?.slice() ?? [])
  const [internalActive, setInternalActive] = createSignal<ActiveTool>(tools()[0] ?? 'polygon')
  const activeTool = (): ActiveTool => props.activeTool ?? internalActive()

  const [selection, setSelection] = createSignal<ShapeSelection>(new Set<string>())
  const [draftPath, setDraftPath] = createSignal<DraftPath | null>(null)
  const [draftCircle, setDraftCircle] = createSignal<DraftCircle | null>(null)
  const [draftSelection, setDraftSelection] = createSignal<DraftSelection | null>(null)

  /**
   * Push shape changes upward.
   *
   * @param next - The new shape list.
   */
  const commitShapes = (next: MapShape[]): void => {
    setShapes(next)
    props.onChange(next)
  }

  /** Reset all three draft states. */
  const clearDrafts = (): void => {
    setDraftPath(null)
    setDraftCircle(null)
    setDraftSelection(null)
  }

  /**
   * Switch the active tool, discarding any in-progress draft.
   *
   * @param next - The next active tool.
   */
  const setActiveTool = (next: ActiveTool): void => {
    clearDrafts()
    if (props.activeTool === undefined) setInternalActive(next)
    props.onActiveToolChange?.(next)
  }

  /**
   * Set an anchor, or add a vertex, at the contact's first position.
   *
   * @param point - The position, relative to the surface.
   */
  const startDrawing = ({ x, y }: ElementDragPoint): void => {
    const screen = { x, y }
    const lngLat = backend().unproject(screen)
    const active = activeTool()

    if (active === 'select') {
      setDraftSelection({ start: screen, current: screen })
      return
    }

    if (active === 'circle') {
      setDraftCircle({ center: lngLat, pointer: lngLat })
      return
    }

    if (active === 'pin') {
      const pin: MapShape = {
        id: makeShapeId(),
        kind: 'pin',
        geometry: { type: 'Point', coordinates: lngLat } satisfies GeoJsonPoint,
      }
      commitShapes([...shapes(), pin])
      return
    }

    if (active === 'polygon' || active === 'line') {
      const open = draftPath()
      // A draft of the other path tool is stale: start over at this position.
      const vertices = open?.kind === active ? open.vertices : []
      setDraftPath({ kind: active, vertices: [...vertices, lngLat] })
    }
  }

  /**
   * Update the circle or marquee preview while the contact moves.
   *
   * @param point - The position, relative to the surface.
   */
  const moveDrawing = ({ x, y }: ElementDragPoint): void => {
    const circle = draftCircle()
    const marquee = draftSelection()
    if (circle) setDraftCircle({ ...circle, pointer: backend().unproject({ x, y }) })
    if (marquee) setDraftSelection({ ...marquee, current: { x, y } })
  }

  /**
   * Commit a circle or a marquee selection from the contact's release
   * position.
   *
   * @param point - The position, relative to the surface.
   */
  const endDrawing = ({ x, y }: ElementDragPoint): void => {
    const circle = draftCircle()
    if (circle) {
      const radius = backend().distanceMeters(circle.center, backend().unproject({ x, y }))
      if (radius > 0) {
        const shape: MapShape = {
          id: makeShapeId(),
          kind: 'circle',
          geometry: { type: 'Point', coordinates: circle.center } satisfies GeoJsonPoint,
          properties: { radiusMeters: radius },
        }
        commitShapes([...shapes(), shape])
      }
      setDraftCircle(null)
    }
    const marquee = draftSelection()
    if (marquee) {
      const next = new Set<string>()
      for (const shape of shapes()) {
        const anchor = anchorScreenPoint(shape, backend())
        if (anchor && pointInRect(anchor, marquee.start, { x, y })) next.add(shape.id)
      }
      setSelection(next)
      setDraftSelection(null)
    }
  }

  /**
   * Discard the draft an interrupted contact leaves behind. A path's
   * vertices stay: they were placed by presses that did complete.
   */
  const cancelDrawing = (): void => {
    if (draftCircle() === null && draftSelection() === null) return
    setDraftCircle(null)
    setDraftSelection(null)
  }

  /** Commit the open polygon or line draft when it has enough vertices. */
  const finishPath = (): void => {
    const draft = draftPath()
    if (!draft) return
    if (draft.kind === 'polygon') {
      const ring = closeRing(draft.vertices)
      if (ring) {
        const polygon: MapShape = {
          id: makeShapeId(),
          kind: 'polygon',
          geometry: { type: 'Polygon', coordinates: [ring] } satisfies GeoJsonPolygon,
        }
        commitShapes([...shapes(), polygon])
      }
    } else if (draft.vertices.length >= 2) {
      const line: MapShape = {
        id: makeShapeId(),
        kind: 'line',
        geometry: {
          type: 'LineString',
          coordinates: draft.vertices.slice(),
        } satisfies GeoJsonLineString,
      }
      commitShapes([...shapes(), line])
    }
    setDraftPath(null)
  }

  /** The shared web drag binding used by the surface. */
  const surfaceDrag: ElementDrag = {
    onStart: startDrawing,
    onMove: moveDrawing,
    onEnd: endDrawing,
    onCancel: cancelDrawing,
  }

  /**
   * Finalise the open polygon or line draft on a double click that nothing
   * inside the surface claimed first.
   *
   * @param event - Native mouse event.
   */
  const handleDoubleClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return
    finishPath()
  }

  /** Remove every selected shape and clear the selection. */
  const deleteSelected = (): void => {
    if (selection().size === 0) return
    const next = shapes().filter((shape) => !selection().has(shape.id))
    setSelection(new Set<string>())
    commitShapes(next)
  }

  // Keep the drafts clear when the controlled active tool changes.
  createEffect(() => {
    if (props.activeTool !== undefined) clearDrafts()
  })

  const hasDraft = (): boolean =>
    draftPath() !== null || draftCircle() !== null || draftSelection() !== null

  const surfaceStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    width:
      props.width === undefined
        ? '100%'
        : typeof props.width === 'number'
          ? `${props.width}px`
          : props.width,
    height:
      props.height === undefined
        ? '400px'
        : typeof props.height === 'number'
          ? `${props.height}px`
          : props.height,
    overflow: 'hidden',
    'touch-action': 'none',
  })

  const overlayStyle = (): JSX.CSSProperties => ({
    position: 'absolute',
    inset: '0px',
    cursor: activeTool() === 'select' ? 'cell' : 'crosshair',
  })

  return (
    <div data-mol-id="map-drawing" class={cm.cn(cm.stack(2), props.className)}>
      <MapDrawingToolbar
        tools={tools()}
        activeTool={activeTool()}
        onActiveToolChange={setActiveTool}
        onDeleteSelected={deleteSelected}
        hasSelection={selection().size > 0}
        hasDraft={hasDraft()}
        onCancelDraft={clearDrafts}
      />
      <div
        ref={(element: HTMLDivElement) => {
          webDrag(element, () => surfaceDrag)
        }}
        role="img"
        aria-label={t('mapDrawing.surface.aria', {}, { defaultValue: 'Map drawing surface' })}
        data-mol-id="map-drawing-surface"
        data-active-tool={activeTool()}
        onDblClick={handleDoubleClick}
        class={cm.cn(cm.surface, cm.borderBPrimary)}
        style={surfaceStyle()}
      >
        <PresentWhileNode node={props.mapSlot}>
          {(mapSlot) => (
            <div data-mol-id="map-drawing-slot" style={{ position: 'absolute', inset: '0px' }}>
              {mapSlot()}
            </div>
          )}
        </PresentWhileNode>
        <svg
          data-mol-id="map-drawing-overlay"
          width="100%"
          height="100%"
          style={overlayStyle()}
          preserveAspectRatio="none"
        >
          {buildOverlayElements(shapes(), draftPath(), draftCircle(), backend(), selection())}
          <Show when={draftSelection()}>
            {(marquee) => (
              <rect
                data-mol-id="map-drawing-selection-rect"
                x={Math.min(marquee().start.x, marquee().current.x)}
                y={Math.min(marquee().start.y, marquee().current.y)}
                width={Math.abs(marquee().current.x - marquee().start.x)}
                height={Math.abs(marquee().current.y - marquee().start.y)}
                fill="currentColor"
                fill-opacity={0.1}
                stroke="currentColor"
                stroke-opacity={0.6}
                stroke-dasharray="4 2"
              />
            )}
          </Show>
        </svg>
      </div>
    </div>
  )
}

/**
 * Compute the anchor (representative) screen-space point for a shape
 * — used by drag-to-select to decide whether a shape lies inside the
 * marquee. Polygons/lines anchor on their first vertex; circles and
 * pins anchor on their center/position.
 *
 * @param shape - Shape to anchor.
 * @param backend - Map backend for projection.
 * @returns Screen-space anchor point or `null` if the geometry is empty.
 */
function anchorScreenPoint(shape: MapShape, backend: MapDrawingBackend): ScreenPoint | null {
  const geometry = shape.geometry
  if (geometry.type === 'Point') {
    return backend.project(geometry.coordinates)
  }
  if (geometry.type === 'LineString') {
    const first = geometry.coordinates[0]
    return first ? backend.project(first) : null
  }
  const ring = geometry.coordinates[0]
  const first = ring?.[0]
  return first ? backend.project(first) : null
}

/**
 * Build the SVG overlay elements (paths, markers, drafts) for the
 * current shape list.
 *
 * @param shapes - Committed shapes.
 * @param draftPath - Open polygon/line draft, or `null`.
 * @param draftCircle - Open circle drag, or `null`.
 * @param backend - Map backend for projection.
 * @param selection - Shape selection set.
 * @returns The SVG children for the overlay.
 */
function buildOverlayElements(
  shapes: MapShape[],
  draftPath: DraftPath | null,
  draftCircle: DraftCircle | null,
  backend: MapDrawingBackend,
  selection: ShapeSelection,
): JSX.Element[] {
  const out: JSX.Element[] = []

  for (const shape of shapes) {
    const selected = selection.has(shape.id)
    const opacity = selected ? 1 : 0.7
    const element = renderShape(shape, backend, 'currentColor', opacity)
    if (element) out.push(element)
  }

  if (draftPath && draftPath.vertices.length > 0) {
    const points = draftPath.vertices
      .map((coords) => backend.project(coords))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    out.push(
      <polyline
        data-mol-id={
          draftPath.kind === 'polygon' ? 'map-drawing-draft-polygon' : 'map-drawing-draft-line'
        }
        points={points}
        fill="none"
        stroke="currentColor"
        stroke-width={2}
        stroke-dasharray="4 4"
      />,
    )
    for (let i = 0; i < draftPath.vertices.length; i += 1) {
      const screen = backend.project(draftPath.vertices[i])
      out.push(
        <circle
          data-mol-id="map-drawing-draft-vertex"
          cx={screen.x}
          cy={screen.y}
          r={3}
          fill="currentColor"
        />,
      )
    }
  }

  if (draftCircle) {
    const center = backend.project(draftCircle.center)
    const edge = backend.project(draftCircle.pointer)
    const dx = edge.x - center.x
    const dy = edge.y - center.y
    const r = Math.sqrt(dx * dx + dy * dy)
    out.push(
      <circle
        data-mol-id="map-drawing-draft-circle"
        cx={center.x}
        cy={center.y}
        r={r}
        fill="currentColor"
        fill-opacity={0.15}
        stroke="currentColor"
        stroke-width={2}
        stroke-dasharray="4 4"
      />,
    )
  }

  return out
}

/**
 * Render a single committed shape as an SVG element.
 *
 * @param shape - Shape to render.
 * @param backend - Map backend for projection.
 * @param stroke - Stroke color.
 * @param opacity - Fill/stroke opacity.
 * @returns An SVG group element, or `null` when the kind and geometry disagree.
 */
function renderShape(
  shape: MapShape,
  backend: MapDrawingBackend,
  stroke: string,
  opacity: number,
): JSX.Element | null {
  const geometry: GeoJsonGeometry = shape.geometry

  if (shape.kind === 'pin' && geometry.type === 'Point') {
    const p = backend.project(geometry.coordinates)
    return (
      <g
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="pin"
        opacity={opacity}
      >
        <circle cx={p.x} cy={p.y} r={6} fill={stroke} />
      </g>
    )
  }

  if (shape.kind === 'circle' && geometry.type === 'Point') {
    const center = backend.project(geometry.coordinates)
    const radiusMeters =
      typeof shape.properties?.radiusMeters === 'number' ? shape.properties.radiusMeters : 0
    const eastLng =
      geometry.coordinates[0] + radiusMetersToDegreesLng(radiusMeters, geometry.coordinates[1])
    const edge = backend.project([eastLng, geometry.coordinates[1]])
    const r = Math.abs(edge.x - center.x)
    return (
      <g
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="circle"
        opacity={opacity}
      >
        <circle
          cx={center.x}
          cy={center.y}
          r={r}
          fill={stroke}
          fill-opacity={0.15}
          stroke={stroke}
          stroke-width={2}
        />
      </g>
    )
  }

  if (shape.kind === 'line' && geometry.type === 'LineString') {
    const points = geometry.coordinates
      .map((coords) => backend.project(coords))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    return (
      <g
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="line"
        opacity={opacity}
      >
        <polyline points={points} fill="none" stroke={stroke} stroke-width={2} />
      </g>
    )
  }

  if (shape.kind === 'polygon' && geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0] ?? []
    const points = ring
      .map((coords) => backend.project(coords))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    return (
      <g
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="polygon"
        opacity={opacity}
      >
        <polygon
          points={points}
          fill={stroke}
          fill-opacity={0.15}
          stroke={stroke}
          stroke-width={2}
        />
      </g>
    )
  }

  return null
}

/**
 * Convert a meter radius to a longitude delta at the given latitude.
 * Used only by the circle renderer to size the rendered circle inside
 * the SVG overlay; the canonical geometry stored on the shape uses
 * meters via `properties.radiusMeters`.
 *
 * @param meters - Distance in meters.
 * @param latitudeDegrees - Latitude in degrees (controls the cosine factor).
 * @returns Longitude delta in degrees.
 */
function radiusMetersToDegreesLng(meters: number, latitudeDegrees: number): number {
  if (!Number.isFinite(meters) || meters === 0) return 0
  // 1° of longitude ≈ 111_320 * cos(lat) meters at the WGS84 sphere.
  const cosLat = Math.cos((latitudeDegrees * Math.PI) / 180)
  const denom = 111_320 * (cosLat === 0 ? 1 : cosLat)
  return meters / denom
}
