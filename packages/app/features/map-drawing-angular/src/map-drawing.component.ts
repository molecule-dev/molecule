/**
 * MapDrawing component (React parity).
 *
 * Angular counterpart of `@molecule/app-map-drawing-react`'s `MapDrawing` — a
 * drawing toolbar over an interaction layer that authors geofence shapes
 * (polygons, circles, pins, lines). Same props (React names), same ClassMap
 * classes and inline styles, same SVG overlay, same pointer semantics, same
 * callback calls.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  computed,
  type ElementRef,
  type OnChanges,
  type OnInit,
  signal,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { closeRing, identityBackend, pointInRect } from './geometry.js'
import { MapDrawingToolbar } from './map-drawing-toolbar.component.js'
import type {
  ActiveTool,
  DrawingTool,
  GeoJsonGeometry,
  MapDrawingBackend,
  MapShape,
  ScreenPoint,
} from './types.js'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether an element carries renderable content (a projected slot landed).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

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

/**
 * Map-drawing surface for geofence editing.
 *
 * The host IS React's root `<div data-mol-id="map-drawing">`
 * (`div[mol-map-drawing]`); the template holds the toolbar and the surface
 * element (the `#surface` ref the pointer coordinates are relative to).
 */
@Component({
  selector: 'div[mol-map-drawing]',
  standalone: true,
  imports: [MapDrawingToolbar],
  inputs: [
    'initialShapes',
    'onChange',
    'tools',
    'activeTool',
    'onActiveToolChange',
    'mapBackend',
    'width',
    'height',
    'className',
  ],
  host: {
    'data-mol-id': 'map-drawing',
    '[class]': 'rootClasses()',
  },
  // prettier-ignore
  template: `<div mol-map-drawing-toolbar [tools]="toolsValue()" [activeTool]="activeToolValue()" [onActiveToolChange]="toolChange" [onDeleteSelected]="deleteHandler" [hasSelection]="selection().size > 0" [hasDraft]="hasDraft()" [onCancelDraft]="cancelHandler"></div><div #surface role="img" [attr.aria-label]="surfaceLabel()" data-mol-id="map-drawing-surface" [attr.data-active-tool]="activeToolValue()" (pointerdown)="handlePointerDown($event)" (pointermove)="handlePointerMove($event)" (pointerup)="handlePointerUp()" (dblclick)="handleDoubleClick()" [class]="surfaceClasses()" [style]="surfaceStyleText()">@if (mapSlotProjected()) {<div #slotEl data-mol-id="map-drawing-slot" style="position: absolute; inset: 0px"><ng-content select="[slot=mapSlot]"></ng-content></div>}<svg data-mol-id="map-drawing-overlay" width="100%" height="100%" [style]="overlayStyleText()" preserveAspectRatio="none">@for (shape of shapes(); track shape.id) {@if (isPin(shape)) {@let p = pinPoint(shape);<g data-mol-id="map-drawing-shape" [attr.data-shape-id]="shape.id" data-shape-kind="pin" [attr.opacity]="shapeOpacity(shape)"><circle [attr.cx]="p.x" [attr.cy]="p.y" r="6" fill="currentColor"></circle></g>} @else if (isCircleShape(shape)) {@let c = circlePoint(shape);<g data-mol-id="map-drawing-shape" [attr.data-shape-id]="shape.id" data-shape-kind="circle" [attr.opacity]="shapeOpacity(shape)"><circle [attr.cx]="c.x" [attr.cy]="c.y" [attr.r]="circleRadius(shape)" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2"></circle></g>} @else if (isLineShape(shape)) {<g data-mol-id="map-drawing-shape" [attr.data-shape-id]="shape.id" data-shape-kind="line" [attr.opacity]="shapeOpacity(shape)"><polyline [attr.points]="linePoints(shape)" fill="none" stroke="currentColor" stroke-width="2"></polyline></g>} @else if (isPolygonShape(shape)) {<g data-mol-id="map-drawing-shape" [attr.data-shape-id]="shape.id" data-shape-kind="polygon" [attr.opacity]="shapeOpacity(shape)"><polygon [attr.points]="polygonPoints(shape)" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2"></polygon></g>}}@if (draftPath(); as draft) {@if (draft.vertices.length > 0) {@let draftPoints = draftPathPoints(draft);<polyline [attr.data-mol-id]="draft.kind === 'polygon' ? 'map-drawing-draft-polygon' : 'map-drawing-draft-line'" [attr.points]="draftPoints" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"></polyline>@for (vertex of draft.vertices; track $index) {@let vertexPoint = projectPoint(vertex);<circle data-mol-id="map-drawing-draft-vertex" [attr.cx]="vertexPoint.x" [attr.cy]="vertexPoint.y" r="3" fill="currentColor"></circle>}}}@if (draftCircle(); as circle) {@let center = draftCircleCenter(circle);@let circleR = draftCircleRadius(circle);<circle data-mol-id="map-drawing-draft-circle" [attr.cx]="center.x" [attr.cy]="center.y" [attr.r]="circleR" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"></circle>}@if (draftSelection(); as marquee) {<rect data-mol-id="map-drawing-selection-rect" [attr.x]="rectX(marquee)" [attr.y]="rectY(marquee)" [attr.width]="rectWidth(marquee)" [attr.height]="rectHeight(marquee)" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="4 2"></rect>}</svg></div>`,
})
export class MapDrawing implements OnInit, OnChanges, AfterViewInit {
  /** Initial shapes to seed the surface with. */
  initialShapes?: MapShape[]
  /** Called whenever the shape list changes (add / edit / delete). */
  onChange?: (shapes: MapShape[]) => void
  /** Drawing tools to expose. */
  tools?: DrawingTool[]
  /** Externally controlled active tool. */
  activeTool?: ActiveTool
  /** Called when the active tool changes. */
  onActiveToolChange?: (tool: ActiveTool) => void
  /** Map backend used to project between geographic and screen coordinates. */
  mapBackend?: MapDrawingBackend
  /** Width of the surface (CSS). */
  width?: number | string
  /** Height of the surface (CSS). */
  height?: number | string
  /** Extra classes merged onto the root element. */
  className?: string

  /** The drawing surface element the pointer coordinates are relative to. */
  @ViewChild('surface') private surfaceRef?: ElementRef<HTMLElement>
  /** The optional map-background wrapper (projected content lands here; read once). */
  @ViewChild('slotEl') private slotEl?: ElementRef<HTMLDivElement>

  /** Whether a `[slot=mapSlot]` projection landed (true until the first view proves otherwise). */
  private readonly mapSlotProjected = signal(true)

  /** The committed shapes. */
  readonly shapes = signal<MapShape[]>([])
  /** The uncontrolled active tool. */
  private readonly internalActive = signal<ActiveTool>('polygon')
  /** The current selection set. */
  readonly selection = signal<ReadonlySet<string>>(new Set<string>())
  /** The open polygon / line draft. */
  readonly draftPath = signal<DraftPath | null>(null)
  /** The open circle drag. */
  readonly draftCircle = signal<DraftCircle | null>(null)
  /** The open marquee drag. */
  readonly draftSelection = signal<DraftSelection | null>(null)

  /** Whether a draft is in progress. */
  readonly hasDraft = computed(
    () =>
      this.draftPath() !== null || this.draftCircle() !== null || this.draftSelection() !== null,
  )

  /** The i18n translator (re-read on every locale switch). */
  private readonly i18n = useTranslation()

  /** The toolbar's tool-change handler. */
  readonly toolChange = (tool: ActiveTool): void => this.setActiveTool(tool)
  /** The toolbar's delete handler. */
  readonly deleteHandler = (): void => this.deleteSelected()
  /** The toolbar's cancel-draft handler. */
  readonly cancelHandler = (): void => this.clearDrafts()

  /** Seed the mutable state from the initial inputs. */
  ngOnInit(): void {
    this.shapes.set(this.initialShapes?.slice() ?? [])
    this.internalActive.set(this.toolsValue()[0] ?? 'polygon')
  }

  /**
   * Clear the drafts when the controlled active tool changes (React's
   * `useEffect([activeToolProp])`).
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeTool'] && this.activeTool !== undefined) this.clearDrafts()
  }

  /**
   * Withdraw the map-slot wrapper when no `[slot=mapSlot]` content landed
   * (React renders it only while `mapSlot` is truthy).
   */
  ngAfterViewInit(): void {
    const slot = this.slotEl?.nativeElement
    if (slot) this.mapSlotProjected.set(hasRenderableContent(slot))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root element's class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The surface's class list (React's `cm.cn(cm.surface, cm.borderBPrimary)`).
   * @returns The class string.
   */
  surfaceClasses(): string {
    return this.cm().cn(this.cm().surface, this.cm().borderBPrimary)
  }

  /**
   * The drawing tools (React's `tools = DEFAULT_TOOLS`).
   * @returns The tool list.
   */
  toolsValue(): DrawingTool[] {
    return this.tools ?? DEFAULT_TOOLS
  }

  /**
   * The active tool (the controlled prop, else the internal state).
   * @returns The active tool.
   */
  activeToolValue(): ActiveTool {
    return this.activeTool ?? this.internalActive()
  }

  /**
   * The map backend (React's `mapBackend = identityBackend`).
   * @returns The backend.
   */
  backend(): MapDrawingBackend {
    return this.mapBackend ?? identityBackend
  }

  /**
   * The translated surface label.
   * @returns The translated label.
   */
  surfaceLabel(): string {
    return this.i18n.t('mapDrawing.surface.aria', {}, { defaultValue: 'Map drawing surface' })
  }

  /**
   * The surface's inline style (React's `surfaceStyle`).
   * @returns The style declarations.
   */
  surfaceStyleText(): string {
    const w =
      this.width === undefined
        ? '100%'
        : typeof this.width === 'number'
          ? `${this.width}px`
          : this.width
    const h =
      this.height === undefined
        ? '400px'
        : typeof this.height === 'number'
          ? `${this.height}px`
          : this.height
    return `position: relative; width: ${w}; height: ${h}; overflow: hidden; touch-action: none`
  }

  /**
   * The overlay's inline style (React's `overlayStyle`).
   * @returns The style declarations.
   */
  overlayStyleText(): string {
    const cursor = this.activeToolValue() === 'select' ? 'cell' : 'crosshair'
    return `position: absolute; inset: 0px; cursor: ${cursor}`
  }

  /**
   * Push shape changes upward.
   * @param next - The new shape list.
   */
  private commitShapes(next: MapShape[]): void {
    this.shapes.set(next)
    this.onChange?.(next)
  }

  /** Reset all three draft states. */
  private clearDrafts(): void {
    this.draftPath.set(null)
    this.draftCircle.set(null)
    this.draftSelection.set(null)
  }

  /**
   * Switch the active tool, discarding any in-progress draft.
   * @param next - The next active tool.
   */
  private setActiveTool(next: ActiveTool): void {
    this.clearDrafts()
    if (this.activeTool === undefined) this.internalActive.set(next)
    this.onActiveToolChange?.(next)
  }

  /**
   * Convert a pointer event's client coords to a screen-space point relative
   * to the drawing surface.
   * @param event - The pointer event.
   * @returns The screen-space point.
   */
  private pointForEvent(event: PointerEvent): ScreenPoint {
    const node = this.surfaceRef?.nativeElement
    if (!node) return { x: event.clientX, y: event.clientY }
    const rect = node.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  /**
   * Handle a pointer press on the surface.
   * @param event - The pointer event.
   */
  handlePointerDown(event: PointerEvent): void {
    const screen = this.pointForEvent(event)
    const lngLat = this.backend().unproject(screen)
    const active = this.activeToolValue()

    if (active === 'select') {
      this.draftSelection.set({ start: screen, current: screen })
      return
    }

    if (active === 'circle') {
      this.draftCircle.set({ center: lngLat, pointer: lngLat })
      return
    }

    if (active === 'pin') {
      const pin: MapShape = {
        id: makeShapeId(),
        kind: 'pin',
        geometry: { type: 'Point', coordinates: lngLat },
      }
      this.commitShapes([...this.shapes(), pin])
      return
    }

    if (active === 'polygon' || active === 'line') {
      const current = this.draftPath()
      if (current && current.kind !== active) {
        this.draftPath.set({ vertices: [lngLat], kind: active })
        return
      }
      this.draftPath.set(
        current
          ? { ...current, vertices: [...current.vertices, lngLat] }
          : { vertices: [lngLat], kind: active },
      )
    }
  }

  /**
   * Handle a pointer move during a circle or marquee drag.
   * @param event - The pointer event.
   */
  handlePointerMove(event: PointerEvent): void {
    const circle = this.draftCircle()
    const marquee = this.draftSelection()
    if (!circle && !marquee) return
    const screen = this.pointForEvent(event)
    if (circle) this.draftCircle.set({ ...circle, pointer: this.backend().unproject(screen) })
    if (marquee) this.draftSelection.set({ ...marquee, current: screen })
  }

  /** Handle a pointer release that commits a circle or a marquee selection. */
  handlePointerUp(): void {
    const circle = this.draftCircle()
    if (circle) {
      const radius = this.backend().distanceMeters(circle.center, circle.pointer)
      if (radius > 0) {
        const shape: MapShape = {
          id: makeShapeId(),
          kind: 'circle',
          geometry: { type: 'Point', coordinates: circle.center },
          properties: { radiusMeters: radius },
        }
        this.commitShapes([...this.shapes(), shape])
      }
      this.draftCircle.set(null)
    }
    const marquee = this.draftSelection()
    if (marquee) {
      const next = new Set<string>()
      for (const shape of this.shapes()) {
        const anchor = this.anchorScreenPoint(shape)
        if (anchor && pointInRect(anchor, marquee.start, marquee.current)) next.add(shape.id)
      }
      this.selection.set(next)
      this.draftSelection.set(null)
    }
  }

  /** Finalise the open polygon or line draft on a double click. */
  handleDoubleClick(): void {
    const draft = this.draftPath()
    if (!draft) return
    if (draft.kind === 'polygon') {
      const ring = closeRing(draft.vertices)
      if (ring) {
        const polygon: MapShape = {
          id: makeShapeId(),
          kind: 'polygon',
          geometry: { type: 'Polygon', coordinates: [ring] },
        }
        this.commitShapes([...this.shapes(), polygon])
      }
    } else if (draft.vertices.length >= 2) {
      const line: MapShape = {
        id: makeShapeId(),
        kind: 'line',
        geometry: { type: 'LineString', coordinates: draft.vertices.slice() },
      }
      this.commitShapes([...this.shapes(), line])
    }
    this.draftPath.set(null)
  }

  /** Remove every selected shape and clear the selection. */
  private deleteSelected(): void {
    if (this.selection().size === 0) return
    const next = this.shapes().filter((shape) => !this.selection().has(shape.id))
    this.selection.set(new Set<string>())
    this.commitShapes(next)
  }

  /**
   * Compute the anchor (representative) screen-space point for a shape.
   * @param shape - Shape to anchor.
   * @returns The screen-space anchor, or `null` when empty.
   */
  private anchorScreenPoint(shape: MapShape): ScreenPoint | null {
    const geometry = shape.geometry
    if (geometry.type === 'Point') return this.backend().project(geometry.coordinates)
    if (geometry.type === 'LineString') {
      const first = geometry.coordinates[0]
      return first ? this.backend().project(first) : null
    }
    const ring = geometry.coordinates[0]
    const first = ring?.[0]
    return first ? this.backend().project(first) : null
  }

  /**
   * Project one `[lng, lat]` position.
   * @param coordinates - The position.
   * @returns The screen-space point.
   */
  projectPoint(coordinates: [number, number]): ScreenPoint {
    return this.backend().project(coordinates)
  }

  /**
   * The opacity of one committed shape (React's selection ring: 1 selected, 0.7 not).
   * @param shape - The shape.
   * @returns The opacity.
   */
  shapeOpacity(shape: MapShape): number {
    return this.selection().has(shape.id) ? 1 : 0.7
  }

  /**
   * Whether a shape renders as a pin.
   * @param shape - The shape.
   * @returns True for a Point pin.
   */
  isPin(shape: MapShape): boolean {
    return shape.kind === 'pin' && shape.geometry.type === 'Point'
  }

  /**
   * Whether a shape renders as a circle.
   * @param shape - The shape.
   * @returns True for a Point circle.
   */
  isCircleShape(shape: MapShape): boolean {
    return shape.kind === 'circle' && shape.geometry.type === 'Point'
  }

  /**
   * Whether a shape renders as a line.
   * @param shape - The shape.
   * @returns True for a LineString line.
   */
  isLineShape(shape: MapShape): boolean {
    return shape.kind === 'line' && shape.geometry.type === 'LineString'
  }

  /**
   * Whether a shape renders as a polygon.
   * @param shape - The shape.
   * @returns True for a Polygon polygon.
   */
  isPolygonShape(shape: MapShape): boolean {
    return shape.kind === 'polygon' && shape.geometry.type === 'Polygon'
  }

  /**
   * The projected center of a pin.
   * @param shape - The pin shape.
   * @returns The screen-space point.
   */
  pinPoint(shape: MapShape): ScreenPoint {
    return this.backend().project(this.pointCoordinates(shape.geometry))
  }

  /**
   * The projected center of a circle.
   * @param shape - The circle shape.
   * @returns The screen-space point.
   */
  circlePoint(shape: MapShape): ScreenPoint {
    return this.backend().project(this.pointCoordinates(shape.geometry))
  }

  /**
   * The rendered screen-space radius of a circle.
   * @param shape - The circle shape.
   * @returns The radius in pixels.
   */
  circleRadius(shape: MapShape): number {
    const coordinates = this.pointCoordinates(shape.geometry)
    const radiusMeters =
      typeof shape.properties?.radiusMeters === 'number' ? shape.properties.radiusMeters : 0
    const center = this.backend().project(coordinates)
    const eastLng = coordinates[0] + this.radiusMetersToDegreesLng(radiusMeters, coordinates[1])
    const edge = this.backend().project([eastLng, coordinates[1]])
    return Math.abs(edge.x - center.x)
  }

  /**
   * The `points` attribute of a line shape.
   * @param shape - The line shape.
   * @returns The SVG points string.
   */
  linePoints(shape: MapShape): string {
    const geometry = shape.geometry
    if (geometry.type !== 'LineString') return ''
    return geometry.coordinates.map((p) => this.pointText(p)).join(' ')
  }

  /**
   * The `points` attribute of a polygon shape.
   * @param shape - The polygon shape.
   * @returns The SVG points string.
   */
  polygonPoints(shape: MapShape): string {
    const geometry = shape.geometry
    if (geometry.type !== 'Polygon') return ''
    const ring = geometry.coordinates[0] ?? []
    return ring.map((p) => this.pointText(p)).join(' ')
  }

  /**
   * The `points` attribute of an open draft path.
   * @param draft - The draft.
   * @returns The SVG points string.
   */
  draftPathPoints(draft: DraftPath): string {
    return draft.vertices.map((p) => this.pointText(p)).join(' ')
  }

  /**
   * The projected center of an open circle draft.
   * @param circle - The circle draft.
   * @returns The screen-space point.
   */
  draftCircleCenter(circle: DraftCircle): ScreenPoint {
    return this.backend().project(circle.center)
  }

  /**
   * The live screen-space radius of an open circle draft.
   * @param circle - The circle draft.
   * @returns The radius in pixels.
   */
  draftCircleRadius(circle: DraftCircle): number {
    const center = this.backend().project(circle.center)
    const edge = this.backend().project(circle.pointer)
    const dx = edge.x - center.x
    const dy = edge.y - center.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * The left edge of the marquee rectangle.
   * @param marquee - The marquee draft.
   * @returns The x coordinate.
   */
  rectX(marquee: DraftSelection): number {
    return Math.min(marquee.start.x, marquee.current.x)
  }

  /**
   * The top edge of the marquee rectangle.
   * @param marquee - The marquee draft.
   * @returns The y coordinate.
   */
  rectY(marquee: DraftSelection): number {
    return Math.min(marquee.start.y, marquee.current.y)
  }

  /**
   * The width of the marquee rectangle.
   * @param marquee - The marquee draft.
   * @returns The width.
   */
  rectWidth(marquee: DraftSelection): number {
    return Math.abs(marquee.current.x - marquee.start.x)
  }

  /**
   * The height of the marquee rectangle.
   * @param marquee - The marquee draft.
   * @returns The height.
   */
  rectHeight(marquee: DraftSelection): number {
    return Math.abs(marquee.current.y - marquee.start.y)
  }

  /**
   * The `[lng, lat]` coordinates of a Point geometry.
   * @param geometry - The geometry.
   * @returns The position (a fallback `[0, 0]` for a non-Point).
   */
  private pointCoordinates(geometry: GeoJsonGeometry): [number, number] {
    return geometry.type === 'Point' ? geometry.coordinates : [0, 0]
  }

  /**
   * Project one position to its `points` text.
   * @param coordinates - The position.
   * @returns The `x,y` string.
   */
  private pointText(coordinates: [number, number]): string {
    const p = this.backend().project(coordinates)
    return `${p.x},${p.y}`
  }

  /**
   * Convert a meter radius to a longitude delta at the given latitude.
   * @param meters - Distance in meters.
   * @param latitudeDegrees - Latitude in degrees.
   * @returns Longitude delta in degrees.
   */
  private radiusMetersToDegreesLng(meters: number, latitudeDegrees: number): number {
    if (!Number.isFinite(meters) || meters === 0) return 0
    const cosLat = Math.cos((latitudeDegrees * Math.PI) / 180)
    const denom = 111_320 * (cosLat === 0 ? 1 : cosLat)
    return meters / denom
  }
}
