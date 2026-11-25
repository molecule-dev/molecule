import type { ReactElement, ReactNode } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { type CSSProperties, type ElementDragPoint, getClassMap } from '@molecule/app-ui'
import { Box, Circle, G, Polygon, Polyline, Rect, Svg } from '@molecule/app-ui-react/elements'

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
  /** Circle tool. */
  kind: 'circle'
  /** Circle center in `[lng, lat]` order. */
  center: [number, number]
  /** Current pointer position in `[lng, lat]` order — used to compute live radius. */
  pointer: [number, number]
}

/** Ephemeral selection-rectangle drag. */
interface DraftSelection {
  /** Selection tool. */
  kind: 'select'
  /** Drag start point, in screen-space pixels. */
  start: ScreenPoint
  /** Current drag point, in screen-space pixels. */
  current: ScreenPoint
}

type Draft = DraftPath | DraftCircle | DraftSelection

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
 * The surface is a pointer instrument: drawing and marquee selection are
 * pointer-driven, and a double-click finalises a path draft. Every command
 * stays keyboard-reachable through the toolbar — the delete button removes
 * the current selection and the cancel-draft button discards an in-progress
 * draft — so no action requires focusing the surface, which is announced to
 * screen readers as a labeled map graphic (`role="img"`). All UI text
 * routes through `t()` so the component translates via the companion locale
 * bond.
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
    mapSlot: mapSlotProp,
    width = '100%',
    height = 400,
    className,
  } = props

  const mapSlot = slot(mapSlotProp)
  const cm = getClassMap()
  const { t } = useTranslation()

  const [shapes, setShapes] = useState<MapShape[]>(() => initialShapes?.slice() ?? [])
  const liveShapes = useRef(shapes)
  const [internalActive, setInternalActive] = useState<ActiveTool>(tools[0] ?? 'polygon')
  const activeTool = activeToolProp ?? internalActive

  const [selection, setSelection] = useState<ShapeSelection>(() => new Set<string>())
  const [draft, setVisibleDraft] = useState<Draft | null>(null)
  const liveDraft = useRef<Draft | null>(null)
  const setDraft = useCallback((next: Draft | null) => {
    // Native can deliver buffered start, move and end in one render batch.
    liveDraft.current = next
    setVisibleDraft(next)
  }, [])
  const draftPath = draft && (draft.kind === 'polygon' || draft.kind === 'line') ? draft : null
  const draftCircle = draft?.kind === 'circle' ? draft : null
  const draftSelection = draft?.kind === 'select' ? draft : null

  // Push shape changes upward.
  const commitShapes = useCallback(
    (next: MapShape[]) => {
      liveShapes.current = next
      setShapes(next)
      onChange(next)
    },
    [onChange],
  )

  const clearDrafts = useCallback(() => {
    setDraft(null)
  }, [setDraft])

  const setActiveTool = useCallback(
    (next: ActiveTool) => {
      // Discard any in-progress draft when the user switches tools.
      clearDrafts()
      if (activeToolProp === undefined) setInternalActive(next)
      onActiveToolChange?.(next)
    },
    [activeToolProp, clearDrafts, onActiveToolChange],
  )

  /** Sets an anchor or adds a vertex at first contact. */
  function startDrawing({ x, y }: ElementDragPoint): void {
    const screen = { x, y }
    const lngLat = mapBackend.unproject(screen)

    if (activeTool === 'select') {
      setDraft({ kind: 'select', start: screen, current: screen })
      return
    }

    if (activeTool === 'circle') {
      setDraft({ kind: 'circle', center: lngLat, pointer: lngLat })
      return
    }

    if (activeTool === 'pin') {
      const pin: MapShape = {
        id: makeShapeId(),
        kind: 'pin',
        geometry: { type: 'Point', coordinates: lngLat } satisfies GeoJsonPoint,
      }
      commitShapes([...liveShapes.current, pin])
      return
    }

    const path = liveDraft.current
    const vertices = path?.kind === activeTool ? path.vertices : []
    setDraft({ kind: activeTool, vertices: [...vertices, lngLat] })
  }

  /** Updates the circle or selection preview while contact moves. */
  function moveDrawing({ x, y }: ElementDragPoint): void {
    const current = liveDraft.current
    if (current?.kind === 'circle') {
      setDraft({ ...current, pointer: mapBackend.unproject({ x, y }) })
    }
    if (current?.kind === 'select') {
      setDraft({ ...current, current: { x, y } })
    }
  }

  /** Commits a circle or selection using the release location. */
  function endDrawing({ x, y }: ElementDragPoint): void {
    const current = liveDraft.current
    if (current?.kind === 'circle') {
      const radius = mapBackend.distanceMeters(current.center, mapBackend.unproject({ x, y }))
      if (radius > 0) {
        const circle: MapShape = {
          id: makeShapeId(),
          kind: 'circle',
          geometry: { type: 'Point', coordinates: current.center } satisfies GeoJsonPoint,
          properties: { radiusMeters: radius },
        }
        commitShapes([...liveShapes.current, circle])
      }
      clearDrafts()
    }
    if (current?.kind === 'select') {
      const next = new Set<string>()
      for (const shape of liveShapes.current) {
        const anchor = anchorScreenPoint(shape, mapBackend)
        if (anchor && pointInRect(anchor, current.start, { x, y })) {
          next.add(shape.id)
        }
      }
      setSelection(next)
      clearDrafts()
    }
  }

  /** Discards the transient draft created by an interrupted drag. */
  function cancelDrawing(): void {
    if (liveDraft.current?.kind === 'circle' || liveDraft.current?.kind === 'select') clearDrafts()
  }

  /** Commits a line or polygon when its draft has enough vertices. */
  function finishPath(): void {
    const path = liveDraft.current
    if (path?.kind !== 'polygon' && path?.kind !== 'line') return
    if (path.kind === 'polygon') {
      const ring = closeRing(path.vertices)
      if (ring) {
        const polygon: MapShape = {
          id: makeShapeId(),
          kind: 'polygon',
          geometry: { type: 'Polygon', coordinates: [ring] } satisfies GeoJsonPolygon,
        }
        commitShapes([...liveShapes.current, polygon])
      }
    } else {
      if (path.vertices.length >= 2) {
        const line: MapShape = {
          id: makeShapeId(),
          kind: 'line',
          geometry: {
            type: 'LineString',
            coordinates: path.vertices.slice(),
          } satisfies GeoJsonLineString,
        }
        commitShapes([...liveShapes.current, line])
      }
    }
    clearDrafts()
  }

  const deleteSelected = useCallback(() => {
    if (selection.size === 0) return
    const next = shapes.filter((shape) => !selection.has(shape.id))
    setSelection(new Set())
    commitShapes(next)
  }, [commitShapes, selection, shapes])

  // A controlled tool change discards any in-progress draft. Adjusted during
  // render (React's pattern for state derived from a previous prop) so the
  // switch and the discarded draft land in the same commit instead of an
  // effect-triggered second render.
  const [prevActiveToolProp, setPrevActiveToolProp] = useState(activeToolProp)
  if (prevActiveToolProp !== activeToolProp) {
    setPrevActiveToolProp(activeToolProp)
    if (activeToolProp !== undefined) {
      setVisibleDraft(null)
    }
  }
  useLayoutEffect(() => {
    if (activeToolProp !== undefined) liveDraft.current = null
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

  // A draft is in progress (path vertices, circle drag or marquee selection).
  const hasDraft = draft !== null

  const ariaLabel = t('mapDrawing.surface.aria', {}, { defaultValue: 'Map drawing surface' })

  return (
    <Box as="div" data-mol-id="map-drawing" className={cm.cn(cm.stack(2), className)}>
      <MapDrawingToolbar
        tools={tools}
        activeTool={activeTool}
        onActiveToolChange={setActiveTool}
        onDeleteSelected={deleteSelected}
        hasSelection={selection.size > 0}
        hasDraft={hasDraft}
        onCancelDraft={clearDrafts}
      />
      <Box
        as="div"
        role="img"
        aria-label={ariaLabel}
        data-mol-id="map-drawing-surface"
        data-active-tool={activeTool}
        drag={{
          onStart: startDrawing,
          onMove: moveDrawing,
          onEnd: endDrawing,
          onCancel: cancelDrawing,
        }}
        secondaryAction={
          activeTool === 'line' || activeTool === 'polygon'
            ? {
                label: t('mapDrawing.surface.finishPath', {}, { defaultValue: 'Finish drawing' }),
                run: finishPath,
              }
            : undefined
        }
        className={cm.cn(cm.surface, cm.borderBPrimary)}
        webStyle={surfaceStyle}
      >
        {mapSlot ? (
          <Box
            as="div"
            data-mol-id="map-drawing-slot"
            webStyle={{ position: 'absolute', inset: 0 }}
          >
            {mapSlot}
          </Box>
        ) : null}
        <Svg
          data-mol-id="map-drawing-overlay"
          width="100%"
          height="100%"
          webStyle={overlayStyle}
          preserveAspectRatio="none"
        >
          {overlayElements}
          {draftSelection ? (
            <Rect
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
        </Svg>
      </Box>
    </Box>
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
): (ReactElement | null)[] {
  const out: (ReactElement | null)[] = []

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
        <Polyline
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
        <Polyline
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
        <Circle
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
      <Circle
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
): ReactElement | null {
  const geometry: GeoJsonGeometry = shape.geometry

  if (shape.kind === 'pin' && geometry.type === 'Point') {
    const p = backend.project(geometry.coordinates)
    return (
      <G
        key={shape.id}
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="pin"
        opacity={opacity}
      >
        <Circle cx={p.x} cy={p.y} r={6} fill={stroke} />
      </G>
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
      <G
        key={shape.id}
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="circle"
        opacity={opacity}
      >
        <Circle
          cx={center.x}
          cy={center.y}
          r={r}
          fill={stroke}
          fillOpacity={0.15}
          stroke={stroke}
          strokeWidth={2}
        />
      </G>
    )
  }

  if (shape.kind === 'line' && geometry.type === 'LineString') {
    const points = geometry.coordinates
      .map((coords) => backend.project(coords))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    return (
      <G
        key={shape.id}
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="line"
        opacity={opacity}
      >
        <Polyline points={points} fill="none" stroke={stroke} strokeWidth={2} />
      </G>
    )
  }

  if (shape.kind === 'polygon' && geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0] ?? []
    const points = ring
      .map((coords) => backend.project(coords))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
    return (
      <G
        key={shape.id}
        data-mol-id="map-drawing-shape"
        data-shape-id={shape.id}
        data-shape-kind="polygon"
        opacity={opacity}
      >
        <Polygon points={points} fill={stroke} fillOpacity={0.15} stroke={stroke} strokeWidth={2} />
      </G>
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
