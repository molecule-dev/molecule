import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { closeRing, identityBackend, pointInRect } from './geometry.js'
import { MapDrawingToolbar } from './MapDrawingToolbar.js'
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
   * In production, callers wire this up against a `MapInstance` from
   * `@molecule/app-maps`.
   */
  mapBackend?: MapDrawingBackend
  /** Optional render slot for the map background (e.g. `<MapView />`). */
  mapSlot?: ReactNode
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
 * Pressing `Backspace` or `Delete` while focused removes the current
 * selection. All UI text routes through `t()` so the component
 * translates via the companion locale bond.
 *
 * @param props - Component props.
 * @returns Rendered map-drawing surface.
 */
export function MapDrawing(props: MapDrawingProps): ReactElement {
  const {
    initialShapes,
    onChange,
    tools = DEFAULT_TOOLS,
    activeTool: activeToolProp,
    onActiveToolChange,
    mapBackend = identityBackend,
    mapSlot,
    width = '100%',
    height = 400,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const [shapes, setShapes] = useState<MapShape[]>(() => initialShapes?.slice() ?? [])
  const [internalActive, setInternalActive] = useState<ActiveTool>(tools[0] ?? 'polygon')
  const activeTool = activeToolProp ?? internalActive

  const [selection, setSelection] = useState<ShapeSelection>(() => new Set<string>())
  const [draftPath, setDraftPath] = useState<DraftPath | null>(null)
  const [draftCircle, setDraftCircle] = useState<DraftCircle | null>(null)
  const [draftSelection, setDraftSelection] = useState<DraftSelection | null>(null)

  const surfaceRef = useRef<HTMLDivElement | null>(null)

  // Push shape changes upward.
  const commitShapes = useCallback(
    (next: MapShape[]) => {
      setShapes(next)
      onChange(next)
    },
    [onChange],
  )

  const setActiveTool = useCallback(
    (next: ActiveTool) => {
      // Discard any in-progress draft when the user switches tools.
      setDraftPath(null)
      setDraftCircle(null)
      setDraftSelection(null)
      if (activeToolProp === undefined) setInternalActive(next)
      onActiveToolChange?.(next)
    },
    [activeToolProp, onActiveToolChange],
  )

  /**
   * Convert a pointer event's client coords to a screen-space point
   * relative to the drawing surface.
   *
   * @param event - React pointer event.
   * @returns Screen-space point.
   */
  const pointForEvent = useCallback((event: ReactPointerEvent<HTMLDivElement>): ScreenPoint => {
    const node = surfaceRef.current
    if (!node) return { x: event.clientX, y: event.clientY }
    const rect = node.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const screen = pointForEvent(event)
      const lngLat = mapBackend.unproject(screen)

      if (activeTool === 'select') {
        setDraftSelection({ start: screen, current: screen })
        return
      }

      if (activeTool === 'circle') {
        setDraftCircle({ center: lngLat, pointer: lngLat })
        return
      }

      if (activeTool === 'pin') {
        const pin: MapShape = {
          id: makeShapeId(),
          kind: 'pin',
          geometry: { type: 'Point', coordinates: lngLat } satisfies GeoJsonPoint,
        }
        commitShapes([...shapes, pin])
        return
      }

      // polygon / line: pointer-down adds a vertex to the open draft.
      if (activeTool === 'polygon' || activeTool === 'line') {
        if (draftPath && draftPath.kind !== activeTool) {
          // Tool flipped mid-draft via external control — drop the stale draft.
          setDraftPath({ vertices: [lngLat], kind: activeTool })
          return
        }
        const next: DraftPath = draftPath
          ? { ...draftPath, vertices: [...draftPath.vertices, lngLat] }
          : { vertices: [lngLat], kind: activeTool }
        setDraftPath(next)
      }
    },
    [activeTool, commitShapes, draftPath, mapBackend, pointForEvent, shapes],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draftCircle && !draftSelection) return
      const screen = pointForEvent(event)
      if (draftCircle) {
        setDraftCircle({ ...draftCircle, pointer: mapBackend.unproject(screen) })
      }
      if (draftSelection) {
        setDraftSelection({ ...draftSelection, current: screen })
      }
    },
    [draftCircle, draftSelection, mapBackend, pointForEvent],
  )

  const handlePointerUp = useCallback(
    (_event: ReactPointerEvent<HTMLDivElement>) => {
      if (draftCircle) {
        const radius = mapBackend.distanceMeters(draftCircle.center, draftCircle.pointer)
        if (radius > 0) {
          const circle: MapShape = {
            id: makeShapeId(),
            kind: 'circle',
            geometry: { type: 'Point', coordinates: draftCircle.center } satisfies GeoJsonPoint,
            properties: { radiusMeters: radius },
          }
          commitShapes([...shapes, circle])
        }
        setDraftCircle(null)
      }
      if (draftSelection) {
        const next = new Set<string>()
        for (const shape of shapes) {
          const anchor = anchorScreenPoint(shape, mapBackend)
          if (anchor && pointInRect(anchor, draftSelection.start, draftSelection.current)) {
            next.add(shape.id)
          }
        }
        setSelection(next)
        setDraftSelection(null)
      }
    },
    [commitShapes, draftCircle, draftSelection, mapBackend, shapes],
  )

  const handleDoubleClick = useCallback(
    (_event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draftPath) return
      if (draftPath.kind === 'polygon') {
        const ring = closeRing(draftPath.vertices)
        if (ring) {
          const polygon: MapShape = {
            id: makeShapeId(),
            kind: 'polygon',
            geometry: { type: 'Polygon', coordinates: [ring] } satisfies GeoJsonPolygon,
          }
          commitShapes([...shapes, polygon])
        }
      } else {
        if (draftPath.vertices.length >= 2) {
          const line: MapShape = {
            id: makeShapeId(),
            kind: 'line',
            geometry: {
              type: 'LineString',
              coordinates: draftPath.vertices.slice(),
            } satisfies GeoJsonLineString,
          }
          commitShapes([...shapes, line])
        }
      }
      setDraftPath(null)
    },
    [commitShapes, draftPath, shapes],
  )

  const deleteSelected = useCallback(() => {
    if (selection.size === 0) return
    const next = shapes.filter((shape) => !selection.has(shape.id))
    setSelection(new Set())
    commitShapes(next)
  }, [commitShapes, selection, shapes])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selection.size > 0) {
          event.preventDefault()
          deleteSelected()
        }
        return
      }
      if (event.key === 'Escape') {
        setDraftPath(null)
        setDraftCircle(null)
        setDraftSelection(null)
      }
    },
    [deleteSelected, selection],
  )

  // Keep internal active tool in sync if the controlled prop changes.
  useEffect(() => {
    if (activeToolProp !== undefined) {
      setDraftPath(null)
      setDraftCircle(null)
      setDraftSelection(null)
    }
  }, [activeToolProp])

  // Render shape geometry as SVG paths/markers in the overlay.
  const overlayElements = useMemo(
    () => buildOverlayElements(shapes, draftPath, draftCircle, mapBackend, selection),
    [draftCircle, draftPath, mapBackend, selection, shapes],
  )

  const surfaceStyle: CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'hidden',
    touchAction: 'none',
  }

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    cursor: activeTool === 'pin' ? 'crosshair' : activeTool === 'select' ? 'cell' : 'crosshair',
  }

  const ariaLabel = t('mapDrawing.surface.aria', {}, { defaultValue: 'Map drawing surface' })

  return (
    <div data-mol-id="map-drawing" className={cm.cn(cm.stack(2), className)}>
      <MapDrawingToolbar
        tools={tools}
        activeTool={activeTool}
        onActiveToolChange={setActiveTool}
        onDeleteSelected={deleteSelected}
        hasSelection={selection.size > 0}
      />
      <div
        ref={surfaceRef}
        role="application"
        aria-label={ariaLabel}
        data-mol-id="map-drawing-surface"
        data-active-tool={activeTool}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={
          handleDoubleClick as unknown as (event: React.MouseEvent<HTMLDivElement>) => void
        }
        onKeyDown={handleKeyDown}
        className={cm.cn(cm.surface, cm.borderBPrimary)}
        style={surfaceStyle}
      >
        {mapSlot ? (
          <div data-mol-id="map-drawing-slot" style={{ position: 'absolute', inset: 0 }}>
            {mapSlot}
          </div>
        ) : null}
        <svg
          data-mol-id="map-drawing-overlay"
          width="100%"
          height="100%"
          style={overlayStyle}
          preserveAspectRatio="none"
        >
          {overlayElements}
          {draftSelection ? (
            <rect
              data-mol-id="map-drawing-selection-rect"
              x={Math.min(draftSelection.start.x, draftSelection.current.x)}
              y={Math.min(draftSelection.start.y, draftSelection.current.y)}
              width={Math.abs(draftSelection.current.x - draftSelection.start.x)}
              height={Math.abs(draftSelection.current.y - draftSelection.start.y)}
              fill="currentColor"
              fillOpacity={0.1}
              stroke="currentColor"
              strokeOpacity={0.6}
              strokeDasharray="4 2"
            />
          ) : null}
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
 * current shape list. Pulled out of the component body so it can be
 * memoised cleanly against the inputs that drive it.
 *
 * @param shapes - Committed shapes.
 * @param draftPath - Open polygon/line draft, or `null`.
 * @param draftCircle - Open circle drag, or `null`.
 * @param backend - Map backend for projection.
 * @param selection - Shape selection set.
 * @returns Array of SVG elements suitable for rendering inside `<svg>`.
 */
function buildOverlayElements(
  shapes: MapShape[],
  draftPath: DraftPath | null,
  draftCircle: DraftCircle | null,
  backend: MapDrawingBackend,
  selection: ShapeSelection,
): ReactNode[] {
  const out: ReactNode[] = []

  for (const shape of shapes) {
    const selected = selection.has(shape.id)
    const stroke = selected ? 'currentColor' : 'currentColor'
    const opacity = selected ? 1 : 0.7
    out.push(renderShape(shape, backend, stroke, opacity))
  }

  if (draftPath && draftPath.vertices.length > 0) {
    const points = draftPath.vertices
      .map((coords) => backend.project(coords))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    if (draftPath.kind === 'polygon') {
      out.push(
        <polyline
          key="__draft_polygon"
          data-mol-id="map-drawing-draft-polygon"
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="4 4"
        />,
      )
    } else {
      out.push(
        <polyline
          key="__draft_line"
          data-mol-id="map-drawing-draft-line"
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="4 4"
        />,
      )
    }
    for (let i = 0; i < draftPath.vertices.length; i += 1) {
      const screen = backend.project(draftPath.vertices[i])
      out.push(
        <circle
          key={`__draft_vertex_${i}`}
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
        key="__draft_circle"
        data-mol-id="map-drawing-draft-circle"
        cx={center.x}
        cy={center.y}
        r={r}
        fill="currentColor"
        fillOpacity={0.15}
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="4 4"
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
 * @returns SVG element.
 */
function renderShape(
  shape: MapShape,
  backend: MapDrawingBackend,
  stroke: string,
  opacity: number,
): ReactNode {
  const geometry: GeoJsonGeometry = shape.geometry

  if (shape.kind === 'pin' && geometry.type === 'Point') {
    const p = backend.project(geometry.coordinates)
    return (
      <g
        key={shape.id}
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
    // Convert the geographic radius into a screen-space radius by
    // projecting a point one radius east of the center and measuring
    // the pixel delta. That keeps the rendered circle accurate for the
    // current zoom level without depending on the backend's internals.
    const eastLng =
      geometry.coordinates[0] + radiusMetersToDegreesLng(radiusMeters, geometry.coordinates[1])
    const edge = backend.project([eastLng, geometry.coordinates[1]])
    const r = Math.abs(edge.x - center.x)
    return (
      <g
        key={shape.id}
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
          fillOpacity={0.15}
          stroke={stroke}
          strokeWidth={2}
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
        key={shape.id}
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="line"
        opacity={opacity}
      >
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} />
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
        key={shape.id}
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="polygon"
        opacity={opacity}
      >
        <polygon points={points} fill={stroke} fillOpacity={0.15} stroke={stroke} strokeWidth={2} />
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
