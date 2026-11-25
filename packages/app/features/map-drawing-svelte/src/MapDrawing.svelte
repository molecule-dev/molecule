<!--
  MapDrawing: the Svelte counterpart of `@molecule/app-map-drawing-react`'s
  `MapDrawing` — a drawing toolbar over an interaction layer that authors
  geofence shapes (polygons, circles, pins, lines). Same props (React names),
  same ClassMap classes and inline styles, same SVG overlay, same pointer
  semantics, same callback calls.

  The surface follows its pointer contact wherever the pointer goes, inside or
  outside the surface, and commits at the release position. A contact that is
  interrupted (the pointer cancelled, the window losing focus) discards the
  circle or marquee it was drawing; path vertices stay.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { type ElementDrag, type ElementDragPoint, getClassMap } from '@molecule/app-ui'
  import { webDrag } from '@molecule/app-ui-svelte'

  import { closeRing, identityBackend, pointInRect } from './geometry.js'
  import MapDrawingToolbar from './MapDrawingToolbar.svelte'
  import type { ActiveTool, DrawingTool, MapDrawingProps, MapShape, ScreenPoint } from './types.js'

  /** Default drawing tools shown in the toolbar. */
  const DEFAULT_TOOLS: DrawingTool[] = ['polygon', 'circle', 'pin', 'line']

  /** Ephemeral in-progress polygon / line draft. */
  interface DraftPath {
    vertices: [number, number][]
    kind: 'polygon' | 'line'
  }

  /** Ephemeral in-progress circle drag. */
  interface DraftCircle {
    center: [number, number]
    pointer: [number, number]
  }

  /** Ephemeral selection-rectangle drag. */
  interface DraftSelection {
    start: ScreenPoint
    current: ScreenPoint
  }

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

  let {
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
  }: MapDrawingProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()

  let shapes = $state<MapShape[]>(untrack(() => initialShapes?.slice() ?? []))
  let internalActive = $state<ActiveTool>(untrack(() => tools[0] ?? 'polygon'))
  const activeTool = $derived<ActiveTool>(activeToolProp ?? internalActive)

  let selection = new SvelteSet<string>()
  let draftPath = $state<DraftPath | null>(null)
  let draftCircle = $state<DraftCircle | null>(null)
  let draftSelection = $state<DraftSelection | null>(null)

  let surfaceEl: HTMLDivElement | undefined = $state()

  const hasSelection = $derived(selection.size > 0)
  const hasDraft = $derived(draftPath !== null || draftCircle !== null || draftSelection !== null)

  /**
   * Push shape changes upward.
   *
   * @param next - The new shape list.
   */
  function commitShapes(next: MapShape[]): void {
    shapes = next
    onChange(next)
  }

  /** Reset all three draft states. */
  function clearDrafts(): void {
    draftPath = null
    draftCircle = null
    draftSelection = null
  }

  /**
   * Switch the active tool, discarding any in-progress draft.
   *
   * @param next - The next active tool.
   */
  function setActiveTool(next: ActiveTool): void {
    clearDrafts()
    if (activeToolProp === undefined) internalActive = next
    onActiveToolChange?.(next)
  }

  /**
   * Set an anchor, or add a vertex, at the contact's first position.
   *
   * @param point - The position, relative to the surface.
   */
  function startDrawing({ x, y }: ElementDragPoint): void {
    const screen = { x, y }
    const lngLat = mapBackend.unproject(screen)
    const active = activeTool

    if (active === 'select') {
      draftSelection = { start: screen, current: screen }
      return
    }

    if (active === 'circle') {
      draftCircle = { center: lngLat, pointer: lngLat }
      return
    }

    if (active === 'pin') {
      const pin: MapShape = {
        id: makeShapeId(),
        kind: 'pin',
        geometry: { type: 'Point', coordinates: lngLat },
      }
      commitShapes([...shapes, pin])
      return
    }

    if (active === 'polygon' || active === 'line') {
      const open = draftPath
      // A draft of the other path tool is stale: start over at this position.
      const vertices = open?.kind === active ? open.vertices : []
      draftPath = { kind: active, vertices: [...vertices, lngLat] }
    }
  }

  /**
   * Update the circle or marquee preview while the contact moves.
   *
   * @param point - The position, relative to the surface.
   */
  function moveDrawing({ x, y }: ElementDragPoint): void {
    if (draftCircle) draftCircle = { ...draftCircle, pointer: mapBackend.unproject({ x, y }) }
    if (draftSelection) draftSelection = { ...draftSelection, current: { x, y } }
  }

  /**
   * Commit a circle or a marquee selection from the contact's release
   * position.
   *
   * @param point - The position, relative to the surface.
   */
  function endDrawing({ x, y }: ElementDragPoint): void {
    if (draftCircle) {
      const radius = mapBackend.distanceMeters(draftCircle.center, mapBackend.unproject({ x, y }))
      if (radius > 0) {
        const circle: MapShape = {
          id: makeShapeId(),
          kind: 'circle',
          geometry: { type: 'Point', coordinates: draftCircle.center },
          properties: { radiusMeters: radius },
        }
        commitShapes([...shapes, circle])
      }
      draftCircle = null
    }
    if (draftSelection) {
      selection.clear()
      for (const shape of shapes) {
        const anchor = anchorScreenPoint(shape)
        if (anchor && pointInRect(anchor, draftSelection.start, { x, y })) {
          selection.add(shape.id)
        }
      }
      draftSelection = null
    }
  }

  /**
   * Discard the draft an interrupted contact leaves behind. A path's
   * vertices stay: they were placed by presses that did complete.
   */
  function cancelDrawing(): void {
    if (!draftCircle && !draftSelection) return
    draftCircle = null
    draftSelection = null
  }

  /** Commit the open polygon or line draft when it has enough vertices. */
  function finishPath(): void {
    if (!draftPath) return
    if (draftPath.kind === 'polygon') {
      const ring = closeRing(draftPath.vertices)
      if (ring) {
        const polygon: MapShape = {
          id: makeShapeId(),
          kind: 'polygon',
          geometry: { type: 'Polygon', coordinates: [ring] },
        }
        commitShapes([...shapes, polygon])
      }
    } else if (draftPath.vertices.length >= 2) {
      const line: MapShape = {
        id: makeShapeId(),
        kind: 'line',
        geometry: { type: 'LineString', coordinates: draftPath.vertices.slice() },
      }
      commitShapes([...shapes, line])
    }
    draftPath = null
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
  function handleDoubleClick(event: MouseEvent): void {
    if (event.defaultPrevented) return
    finishPath()
  }

  /** Remove every selected shape and clear the selection. */
  function deleteSelected(): void {
    if (selection.size === 0) return
    const next = shapes.filter((shape) => !selection.has(shape.id))
    selection.clear()
    commitShapes(next)
  }

  // Keep the drafts clear when the controlled active tool changes.
  $effect(() => {
    if (activeToolProp !== undefined) clearDrafts()
  })

  /**
   * Compute the anchor (representative) screen-space point for a shape.
   *
   * @param shape - Shape to anchor.
   * @returns Screen-space anchor point or `null` if the geometry is empty.
   */
  function anchorScreenPoint(shape: MapShape): ScreenPoint | null {
    const geometry = shape.geometry
    if (geometry.type === 'Point') return mapBackend.project(geometry.coordinates)
    if (geometry.type === 'LineString') {
      const first = geometry.coordinates[0]
      return first ? mapBackend.project(first) : null
    }
    const ring = geometry.coordinates[0]
    const first = ring?.[0]
    return first ? mapBackend.project(first) : null
  }

  /**
   * The rendered screen-space radius of a circle shape.
   *
   * @param coordinates - The circle's center `[lng, lat]`.
   * @param radiusMeters - The circle's geographic radius in meters.
   * @returns The circle's pixel radius.
   */
  function circleRadius(coordinates: [number, number], radiusMeters: number): number {
    const center = mapBackend.project(coordinates)
    const eastLng = coordinates[0] + radiusMetersToDegreesLng(radiusMeters, coordinates[1])
    const edge = mapBackend.project([eastLng, coordinates[1]])
    return Math.abs(edge.x - center.x)
  }

  /**
   * Convert a meter radius to a longitude delta at the given latitude.
   *
   * @param meters - Distance in meters.
   * @param latitudeDegrees - Latitude in degrees (controls the cosine factor).
   * @returns Longitude delta in degrees.
   */
  function radiusMetersToDegreesLng(meters: number, latitudeDegrees: number): number {
    if (!Number.isFinite(meters) || meters === 0) return 0
    const cosLat = Math.cos((latitudeDegrees * Math.PI) / 180)
    const denom = 111_320 * (cosLat === 0 ? 1 : cosLat)
    return meters / denom
  }

  /**
   * The surface's inline style (React's `surfaceStyle`).
   *
   * @returns The style declarations.
   */
  function surfaceStyleText(): string {
    const w = typeof width === 'number' ? `${width}px` : width
    const h = typeof height === 'number' ? `${height}px` : height
    return `position: relative; width: ${w}; height: ${h}; overflow: hidden; touch-action: none`
  }

  /**
   * The overlay's inline style (React's `overlayStyle`).
   *
   * @returns The style declarations.
   */
  function overlayStyleText(): string {
    return `position: absolute; inset: 0px; cursor: ${activeTool === 'select' ? 'cell' : 'crosshair'}`
  }
</script>

<div data-mol-id="map-drawing" class={cm.cn(cm.stack(2), className)}>
  <MapDrawingToolbar
    {tools}
    {activeTool}
    onActiveToolChange={setActiveTool}
    onDeleteSelected={deleteSelected}
    {hasSelection}
    {hasDraft}
    onCancelDraft={clearDrafts}
  />
  <div
    bind:this={surfaceEl}
    role="img"
    aria-label={t('mapDrawing.surface.aria', {}, { defaultValue: 'Map drawing surface' })}
    data-mol-id="map-drawing-surface"
    data-active-tool={activeTool}
    ondblclick={handleDoubleClick}
    class={cm.cn(cm.surface, cm.borderBPrimary)}
    style={surfaceStyleText()}
    use:webDrag={surfaceDrag}
  >
    {#if mapSlot}
      <PresentWhileContent data-mol-id="map-drawing-slot" style="position: absolute; inset: 0px">
        {@render mapSlot?.()}
      </PresentWhileContent>
    {/if}
    <svg
      data-mol-id="map-drawing-overlay"
      width="100%"
      height="100%"
      style={overlayStyleText()}
      preserveAspectRatio="none"
    >
      {#each shapes as shape (shape.id)}
        {@const selected = selection.has(shape.id)}
        {#if shape.kind === 'pin' && shape.geometry.type === 'Point'}
          {@const p = mapBackend.project(shape.geometry.coordinates)}
          <g
            data-mol-id="map-drawing-shape"
            data-shape-id={shape.id}
            data-shape-kind="pin"
            opacity={selected ? 1 : 0.7}
          >
            <circle cx={p.x} cy={p.y} r={6} fill="currentColor" />
          </g>
        {:else if shape.kind === 'circle' && shape.geometry.type === 'Point'}
          {@const center = mapBackend.project(shape.geometry.coordinates)}
          {@const radius =
            typeof shape.properties?.radiusMeters === 'number' ? shape.properties.radiusMeters : 0}
          <g
            data-mol-id="map-drawing-shape"
            data-shape-id={shape.id}
            data-shape-kind="circle"
            opacity={selected ? 1 : 0.7}
          >
            <circle
              cx={center.x}
              cy={center.y}
              r={circleRadius(shape.geometry.coordinates, radius)}
              fill="currentColor"
              fill-opacity={0.15}
              stroke="currentColor"
              stroke-width={2}
            />
          </g>
        {:else if shape.kind === 'line' && shape.geometry.type === 'LineString'}
          {@const points = shape.geometry.coordinates
            .map((coords) => mapBackend.project(coords))
            .map((p) => `${p.x},${p.y}`)
            .join(' ')}
          <g
            data-mol-id="map-drawing-shape"
            data-shape-id={shape.id}
            data-shape-kind="line"
            opacity={selected ? 1 : 0.7}
          >
            <polyline {points} fill="none" stroke="currentColor" stroke-width={2} />
          </g>
        {:else if shape.kind === 'polygon' && shape.geometry.type === 'Polygon'}
          {@const points = (shape.geometry.coordinates[0] ?? [])
            .map((coords) => mapBackend.project(coords))
            .map((p) => `${p.x},${p.y}`)
            .join(' ')}
          <g
            data-mol-id="map-drawing-shape"
            data-shape-id={shape.id}
            data-shape-kind="polygon"
            opacity={selected ? 1 : 0.7}
          >
            <polygon
              {points}
              fill="currentColor"
              fill-opacity={0.15}
              stroke="currentColor"
              stroke-width={2}
            />
          </g>
        {/if}
      {/each}
      {#if draftPath && draftPath.vertices.length > 0}
        {@const points = draftPath.vertices
          .map((coords) => mapBackend.project(coords))
          .map((p) => `${p.x},${p.y}`)
          .join(' ')}
        <polyline
          data-mol-id={draftPath.kind === 'polygon'
            ? 'map-drawing-draft-polygon'
            : 'map-drawing-draft-line'}
          {points}
          fill="none"
          stroke="currentColor"
          stroke-width={2}
          stroke-dasharray="4 4"
        />
        {#each draftPath.vertices as coords, i (i)}
          {@const screen = mapBackend.project(coords)}
          <circle
            data-mol-id="map-drawing-draft-vertex"
            cx={screen.x}
            cy={screen.y}
            r={3}
            fill="currentColor"
          />
        {/each}
      {/if}
      {#if draftCircle}
        {@const center = mapBackend.project(draftCircle.center)}
        {@const edge = mapBackend.project(draftCircle.pointer)}
        {@const dx = edge.x - center.x}
        {@const dy = edge.y - center.y}
        <circle
          data-mol-id="map-drawing-draft-circle"
          cx={center.x}
          cy={center.y}
          r={Math.sqrt(dx * dx + dy * dy)}
          fill="currentColor"
          fill-opacity={0.15}
          stroke="currentColor"
          stroke-width={2}
          stroke-dasharray="4 4"
        />
      {/if}
      {#if draftSelection}
        <rect
          data-mol-id="map-drawing-selection-rect"
          x={Math.min(draftSelection.start.x, draftSelection.current.x)}
          y={Math.min(draftSelection.start.y, draftSelection.current.y)}
          width={Math.abs(draftSelection.current.x - draftSelection.start.x)}
          height={Math.abs(draftSelection.current.y - draftSelection.start.y)}
          fill="currentColor"
          fill-opacity={0.1}
          stroke="currentColor"
          stroke-opacity={0.6}
          stroke-dasharray="4 2"
        />
      {/if}
    </svg>
  </div>
</div>
