/**
 * CanvasEngine component (React parity).
 *
 * @module
 */

import {
  Component,
  ElementRef,
  inject,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import {
  type Bounds,
  CanvasSurface,
  type CanvasViewport,
  screenToCanvas,
} from '@molecule/app-feature-canvas-angular'
import { getClassMap } from '@molecule/app-ui'

import { alignLayers, distributeLayers } from './alignment.js'
import { combinedBounds, elementBounds, rectsIntersect, snapToGrid } from './geometry.js'
import { DEFAULT_HISTORY_LIMIT, HistoryStack } from './history.js'
import type {
  CanvasAlignment,
  CanvasDistribution,
  CanvasDocument,
  CanvasSelection,
  VectorElement,
  VectorElementId,
  VectorGroup,
} from './types.js'
import { VectorElementSvg } from './vector-element-svg.component.js'

/**
 * Produces a fresh element id, opaque to consumers.
 *
 * @param prefix - The id prefix (`group`).
 * @returns A unique id.
 */
function nextId(prefix: string): VectorElementId {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

/**
 * Translates an element by `(dx, dy)` and snaps its origin to the grid when
 * `gridSize > 0`. Group children translate uniformly; lines translate both
 * endpoints.
 *
 * @param element - Element to move.
 * @param dx - X-axis displacement in canvas units.
 * @param dy - Y-axis displacement in canvas units.
 * @param gridStep - Grid spacing; `<= 0` disables snapping.
 * @returns The moved element.
 */
function moveElement(
  element: VectorElement,
  dx: number,
  dy: number,
  gridStep: number,
): VectorElement {
  if (element.kind === 'line') {
    const x1 = snapToGrid(element.x1 + dx, gridStep)
    const y1 = snapToGrid(element.y1 + dy, gridStep)
    const offsetX = x1 - element.x1
    const offsetY = y1 - element.y1
    return { ...element, x1, y1, x2: element.x2 + offsetX, y2: element.y2 + offsetY }
  }
  if (element.kind === 'group') {
    const x = snapToGrid(element.x + dx, gridStep)
    const y = snapToGrid(element.y + dy, gridStep)
    const offsetX = x - element.x
    const offsetY = y - element.y
    return {
      ...element,
      x,
      y,
      children: element.children.map((c) => moveElement(c, offsetX, offsetY, 0)),
    }
  }
  return {
    ...element,
    x: snapToGrid(element.x + dx, gridStep),
    y: snapToGrid(element.y + dy, gridStep),
  }
}

/**
 * Vector design-tool canvas engine: the Angular counterpart of
 * `@molecule/app-canvas-engine-react`'s `<CanvasEngine>` — the pan/zoom surface
 * plus the grid, marquee selector, element drag and undo/redo.
 *
 * The host IS React's root (`<div data-mol-id="canvas-engine">`), so the same
 * ClassMap classes, inline styles and DOM render for the same input. The
 * component is dual-mode: `document` is treated as controlled when `onChange`
 * is supplied, otherwise the first document seeds internal state; `selection`
 * follows the same convention. The imperative handle is this component's
 * public methods (`undo`, `redo`, `canUndo`, `canRedo`, `align`, `distribute`,
 * `group`, `ungroup`), which a host reaches through `@ViewChild`.
 */
@Component({
  selector: 'div[mol-canvas-engine]',
  standalone: true,
  imports: [CanvasSurface, VectorElementSvg],
  inputs: [
    'document',
    'onChange',
    'selection',
    'onSelectionChange',
    'snapToGrid',
    'gridSize',
    'width',
    'height',
    'showGrid',
    'ariaLabel',
    'historyLimit',
    'className',
  ],
  host: {
    'data-mol-id': 'canvas-engine',
    '[attr.data-canvas-engine-snap]': 'snapEnabled() ? "true" : "false"',
    '[attr.data-canvas-engine-grid]': 'grid()',
    '[class]': 'classes()',
    '[style.position]': "'relative'",
  },
  template: `<div
    mol-canvas-surface
    [viewport]="viewport"
    [onViewportChange]="setViewport"
    [width]="surfaceWidth()"
    [height]="surfaceHeight()"
    [ariaLabel]="resolvedAriaLabel()"
    [onBackgroundPointerDown]="onBackgroundPointerDown"
  >
    <svg
      data-mol-id="canvas-engine-svg"
      [attr.width]="currentDoc().width"
      [attr.height]="currentDoc().height"
      [attr.viewBox]="'0 0 ' + currentDoc().width + ' ' + currentDoc().height"
      [style]="svgStyle"
      (pointermove)="onSvgPointerMove($event)"
      (pointerup)="onSvgPointerUp($event)"
      (pointercancel)="onSvgPointerUp($event)"
    >
      @if (gridVisible()) {
        <defs>
          <pattern
            [attr.id]="gridId"
            [attr.width]="grid()"
            [attr.height]="grid()"
            patternUnits="userSpaceOnUse"
          >
            <path
              [attr.d]="'M ' + grid() + ' 0 L 0 0 0 ' + grid()"
              fill="none"
              stroke="currentColor"
              stroke-opacity="0.08"
              stroke-width="1"
            ></path>
          </pattern>
        </defs>
      }
      @if (gridVisible()) {
        <rect
          x="0"
          y="0"
          [attr.width]="currentDoc().width"
          [attr.height]="currentDoc().height"
          [attr.fill]="'url(#' + gridId + ')'"
          data-mol-id="canvas-engine-grid"
        ></rect>
      }
      @for (layer of currentDoc().layers; track layer.id) {
        <g (pointerdown)="onElementPointerDown($event, layer.id)">
          <g
            mol-vector-element-svg
            [element]="layer"
            [selected]="currentSelection().includes(layer.id)"
          ></g>
        </g>
      }
      @if (marquee; as box) {
        <rect
          data-mol-id="canvas-engine-marquee"
          [attr.x]="box.x"
          [attr.y]="box.y"
          [attr.width]="box.width"
          [attr.height]="box.height"
          fill="currentColor"
          fill-opacity="0.08"
          stroke="currentColor"
          stroke-opacity="0.4"
          stroke-width="1"
          stroke-dasharray="4 2"
          pointer-events="none"
        ></rect>
      }
    </svg>
  </div>`,
})
export class CanvasEngine implements OnInit, OnChanges {
  /** Document to render. Treated as controlled when `onChange` is set. */
  document!: CanvasDocument
  /** Called whenever the engine mutates the document. */
  onChange?: (next: CanvasDocument) => void
  /** Currently-selected element ids. */
  selection?: CanvasSelection
  /** Notified whenever the selection set changes. */
  onSelectionChange?: (next: CanvasSelection) => void
  /** Snap newly-positioned elements to the nearest grid line (default true). */
  snapToGrid?: boolean
  /** Grid spacing in canvas units (default 8). */
  gridSize?: number
  /** Width of the surface in CSS pixels (defaults to `document.width`). */
  width?: number
  /** Height of the surface in CSS pixels (defaults to `document.height`). */
  height?: number
  /** Whether to draw the snap grid (defaults to whether snapping is on). */
  showGrid?: boolean
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Maximum number of undo entries kept (default 100). */
  historyLimit?: number
  /** Extra classes merged onto the outer surface. */
  className?: string

  /** The engine's own root element (this component's host). */
  private readonly host = inject<ElementRef<HTMLDivElement>>(ElementRef)
  /** Reactive translation. */
  private readonly i18n = useTranslation()

  /** The uncontrolled document (React's `useState` seed). */
  private internalDoc!: CanvasDocument
  /** The uncontrolled selection (React's `useState` seed). */
  private internalSelection!: CanvasSelection

  /** The surface viewport (controlled by this component). */
  viewport: CanvasViewport = { x: 0, y: 0, zoom: 1 }

  /** Active marquee gesture in canvas-space coordinates. */
  marquee: Bounds | null = null

  /** Grid pattern id: unique per instance so engines do not collide. */
  readonly gridId = `canvas-engine-grid-${nextId('g')}`

  /** The SVG layer's inline style (React's `svgStyle`). */
  readonly svgStyle =
    'position: absolute; top: 0px; left: 0px; pointer-events: auto; overflow: visible'

  /** The bounded undo/redo stack. */
  private history = new HistoryStack(DEFAULT_HISTORY_LIMIT)

  /** Active marquee origin in canvas space. */
  private marqueeOrigin: { x: number; y: number; pointerId: number } | null = null
  /** Whether the marquee gesture adds to the selection. */
  private additive = false
  /** The selection the additive marquee starts from. */
  private baseSelection: CanvasSelection = []

  /** Drag state for the selection-move gesture. */
  private dragState: {
    pointerId: number
    last: { x: number; y: number }
    committed: boolean
  } | null = null

  /**
   * Seeds the uncontrolled state and the history limit (React's first render:
   * inputs are set before this hook runs).
   */
  ngOnInit(): void {
    this.internalDoc = this.document
    this.internalSelection = this.selection ?? []
    this.history = new HistoryStack(this.historyLimit ?? DEFAULT_HISTORY_LIMIT)
  }

  /**
   * Keeps the uncontrolled document in sync when `document` changes.
   *
   * @param changes - The inputs that changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.onChange == null && this.internalDoc !== undefined)
      this.internalDoc = this.document
  }

  /**
   * The class map.
   *
   * @returns The UIClassMap.
   */
  cm = getClassMap()

  /**
   * The outer element's class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm.cn(this.cm.position('relative'), this.className)
  }

  /**
   * Whether snapping is on (React's `snapToGrid = true`).
   *
   * @returns `true` unless the input says false.
   */
  snapEnabled(): boolean {
    return this.snapToGrid !== false
  }

  /**
   * The grid spacing in canvas units.
   *
   * @returns The spacing (default 8).
   */
  grid(): number {
    return this.gridSize ?? 8
  }

  /**
   * Whether the grid is drawn.
   *
   * @returns `true` unless the `showGrid` input says otherwise (defaults to snapping).
   */
  gridVisible(): boolean {
    return this.showGrid ?? this.snapEnabled()
  }

  /**
   * The document in effect: the controlled prop, or internal state.
   *
   * @returns The current document.
   */
  currentDoc(): CanvasDocument {
    return this.onChange != null ? this.document : this.internalDoc
  }

  /**
   * The selection in effect: the controlled prop, or internal state.
   *
   * @returns The current selection.
   */
  currentSelection(): CanvasSelection {
    return this.onSelectionChange != null ? (this.selection ?? []) : this.internalSelection
  }

  /**
   * The surface width (defaults to the document's).
   *
   * @returns The width in CSS pixels.
   */
  surfaceWidth(): number {
    return this.width ?? this.currentDoc().width
  }

  /**
   * The surface height (defaults to the document's).
   *
   * @returns The height in CSS pixels.
   */
  surfaceHeight(): number {
    return this.height ?? this.currentDoc().height
  }

  /**
   * The accessible name of the surface.
   *
   * @returns The aria label.
   */
  resolvedAriaLabel(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('canvasEngine.aria.surface', {}, { defaultValue: 'Vector canvas editor' })
    )
  }

  /**
   * Stores a viewport reported by the surface.
   *
   * @param next - The new viewport.
   */
  readonly setViewport = (next: CanvasViewport): void => {
    this.viewport = next
  }

  // ---------------------------------------------------------------------
  // Public imperative handle
  // ---------------------------------------------------------------------

  /** Undo the last document mutation. No-op when the stack is empty. */
  undo(): void {
    const prev = this.history.undo({ document: this.currentDoc() })
    if (!prev) return
    if (this.onChange != null) this.onChange(prev.document)
    else this.internalDoc = prev.document
  }

  /** Redo a previously-undone mutation. No-op when the stack is empty. */
  redo(): void {
    const next = this.history.redo({ document: this.currentDoc() })
    if (!next) return
    if (this.onChange != null) this.onChange(next.document)
    else this.internalDoc = next.document
  }

  /**
   * Whether there is at least one entry to undo.
   *
   * @returns `true` when `undo` would do something.
   */
  canUndo(): boolean {
    return this.history.canUndo()
  }

  /**
   * Whether there is at least one entry to redo.
   *
   * @returns `true` when `redo` would do something.
   */
  canRedo(): boolean {
    return this.history.canRedo()
  }

  /**
   * Aligns the selected elements along an edge or axis.
   *
   * @param mode - Alignment mode.
   */
  align(mode: CanvasAlignment): void {
    const layers = alignLayers(this.currentDoc().layers, this.currentSelection(), mode)
    this.commitDoc({ ...this.currentDoc(), layers })
  }

  /**
   * Distributes three or more selected elements across an axis.
   *
   * @param axis - Distribution axis.
   */
  distribute(axis: CanvasDistribution): void {
    const layers = distributeLayers(this.currentDoc().layers, this.currentSelection(), axis)
    this.commitDoc({ ...this.currentDoc(), layers })
  }

  /** Wraps the current selection in a new group element. */
  group(): void {
    const document = this.currentDoc()
    const selection = this.currentSelection()
    if (selection.length < 2) return
    const selectedLayers = document.layers.filter((l) => selection.includes(l.id))
    if (selectedLayers.length < 2) return
    const env = combinedBounds(selectedLayers)
    const groupId = nextId('group')
    const groupEl: VectorGroup = {
      id: groupId,
      kind: 'group',
      x: env.x,
      y: env.y,
      width: env.width,
      height: env.height,
      children: selectedLayers,
    }
    const remaining = document.layers.filter((l) => !selection.includes(l.id))
    const topmostIdx = document.layers.findIndex((l) => selection.includes(l.id))
    const insertAt = Math.max(0, remaining.length - (document.layers.length - topmostIdx) + 1)
    const layers = [...remaining.slice(0, insertAt), groupEl, ...remaining.slice(insertAt)]
    this.commitDoc({ ...document, layers })
    this.commitSelection([groupId])
  }

  /** Ungroups every selected group element, replacing it with its children. */
  ungroup(): void {
    const document = this.currentDoc()
    const selection = this.currentSelection()
    if (selection.length === 0) return
    const layers: VectorElement[] = []
    const newSelection: VectorElementId[] = []
    for (const layer of document.layers) {
      if (selection.includes(layer.id) && layer.kind === 'group') {
        for (const child of layer.children) {
          layers.push(child)
          newSelection.push(child.id)
        }
      } else {
        layers.push(layer)
        if (selection.includes(layer.id)) newSelection.push(layer.id)
      }
    }
    this.commitDoc({ ...document, layers })
    this.commitSelection(newSelection)
  }

  // ---------------------------------------------------------------------
  // Marquee + click selection
  // ---------------------------------------------------------------------

  /**
   * Commits a mutated document, recording the previous one first.
   *
   * @param next - The new document.
   * @param recordHistory - Whether to push a history entry (default true).
   */
  private commitDoc(next: CanvasDocument, recordHistory = true): void {
    if (recordHistory) this.history.push({ document: this.currentDoc() })
    if (this.onChange != null) this.onChange(next)
    else this.internalDoc = next
  }

  /**
   * Commits a new selection.
   *
   * @param next - The new selection.
   */
  private commitSelection(next: CanvasSelection): void {
    if (this.onSelectionChange != null) this.onSelectionChange(next)
    else this.internalSelection = next
  }

  /**
   * Translates a pointer's client coordinates into canvas space.
   *
   * @param clientX - Viewport x of the pointer.
   * @param clientY - Viewport y of the pointer.
   * @returns The point in canvas space.
   */
  private screenToDocCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.host.nativeElement.getBoundingClientRect()
    return screenToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, this.viewport)
  }

  /**
   * Starts a marquee gesture on the empty surface.
   *
   * @param event - The pointerdown event.
   */
  readonly onBackgroundPointerDown = (event: PointerEvent): void => {
    // Begin a marquee gesture; clear selection unless modifier held.
    const additive = event.shiftKey || event.metaKey || event.ctrlKey
    this.additive = additive
    this.baseSelection = additive ? this.currentSelection().slice() : []
    const start = this.screenToDocCoords(event.clientX, event.clientY)
    this.marqueeOrigin = { x: start.x, y: start.y, pointerId: event.pointerId }
    this.marquee = { x: start.x, y: start.y, width: 0, height: 0 }
    if (!additive) this.commitSelection([])
  }

  /**
   * Extends the marquee and updates the selection live.
   *
   * @param event - The pointermove event.
   */
  private onSurfacePointerMove(event: PointerEvent): void {
    const origin = this.marqueeOrigin
    if (!origin || origin.pointerId !== event.pointerId) return
    const cur = this.screenToDocCoords(event.clientX, event.clientY)
    const x = Math.min(origin.x, cur.x)
    const y = Math.min(origin.y, cur.y)
    const width = Math.abs(cur.x - origin.x)
    const height = Math.abs(cur.y - origin.y)
    const next = { x, y, width, height }
    this.marquee = next
    // Update selection live during drag.
    const hits = this.currentDoc()
      .layers.filter((l) => rectsIntersect(elementBounds(l), next))
      .map((l) => l.id)
    const merged = this.additive ? Array.from(new Set([...this.baseSelection, ...hits])) : hits
    this.commitSelection(merged)
  }

  /**
   * Ends the marquee gesture.
   *
   * @param event - The pointerup or pointercancel event.
   */
  private onSurfacePointerUp(event: PointerEvent): void {
    const origin = this.marqueeOrigin
    if (!origin || origin.pointerId !== event.pointerId) return
    this.marqueeOrigin = null
    this.marquee = null
  }

  /**
   * Runs both surface handlers behind the SVG's pointer-move binding.
   *
   * @param event - The pointermove event.
   */
  onSvgPointerMove(event: PointerEvent): void {
    this.onSurfacePointerMove(event)
    this.onElementPointerMove(event)
  }

  /**
   * Runs both surface handlers behind the SVG's pointer-up binding.
   *
   * @param event - The pointerup or pointercancel event.
   */
  onSvgPointerUp(event: PointerEvent): void {
    this.onSurfacePointerUp(event)
    this.onElementPointerUp(event)
  }

  /**
   * Selects (or toggles) the pressed element and starts a drag gesture.
   *
   * @param event - The pointerdown event.
   * @param id - The element id under the pointer.
   */
  onElementPointerDown(event: PointerEvent, id: VectorElementId): void {
    event.stopPropagation()
    const additive = event.shiftKey || event.metaKey || event.ctrlKey
    const selection = this.currentSelection()
    if (additive) {
      const next = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]
      this.commitSelection(next)
    } else if (!selection.includes(id)) {
      this.commitSelection([id])
    }
    // Begin a drag gesture for moving the selection.
    const start = this.screenToDocCoords(event.clientX, event.clientY)
    this.dragState = { pointerId: event.pointerId, last: start, committed: false }
    try {
      ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    } catch (_error) {
      /* jsdom may throw — ignore: pointer capture is best-effort. */
    }
  }

  /**
   * Moves the selected layers by the pointer's delta, snapping to the grid.
   *
   * @param event - The pointermove event.
   */
  private onElementPointerMove(event: PointerEvent): void {
    const state = this.dragState
    if (!state || state.pointerId !== event.pointerId) return
    const cur = this.screenToDocCoords(event.clientX, event.clientY)
    const dx = cur.x - state.last.x
    const dy = cur.y - state.last.y
    state.last = cur
    if (dx === 0 && dy === 0) return
    const document = this.currentDoc()
    const selection = this.currentSelection()
    const step = this.snapEnabled() ? this.grid() : 0
    const layers = document.layers.map((layer) => {
      if (!selection.includes(layer.id)) return layer
      return moveElement(layer, dx, dy, step)
    })
    // Only push history once per drag gesture.
    const recordHistory = !state.committed
    state.committed = true
    this.commitDoc({ ...document, layers }, recordHistory)
  }

  /**
   * Ends the element drag gesture.
   *
   * @param event - The pointerup or pointercancel event.
   */
  private onElementPointerUp(event: PointerEvent): void {
    const state = this.dragState
    if (!state || state.pointerId !== event.pointerId) return
    this.dragState = null
    try {
      ;(event.currentTarget as Element).releasePointerCapture(event.pointerId)
    } catch (_error) {
      /* jsdom may throw — ignore: pointer release is best-effort. */
    }
  }
}
