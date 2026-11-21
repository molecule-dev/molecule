/**
 * WhiteboardCanvas component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, type OnInit, signal, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import {
  type CanvasViewport,
  clampViewport,
  screenToCanvas,
  type ViewportLimits,
} from '@molecule/app-feature-canvas-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import {
  buildShapePath,
  buildStrokePath,
  defaultShapeStyle,
  defaultStickyNoteStyle,
  defaultStrokeColor,
  defaultStrokeWidth,
  generateWhiteboardId,
  shapeBounds,
} from './strokes.js'
import type {
  WhiteboardChange,
  WhiteboardShape,
  WhiteboardShapeKind,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardStrokeKind,
  WhiteboardTool,
} from './types.js'

/** The viewport an uncontrolled surface starts from (React's `useState` default). */
const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 }

/**
 * Narrows a tool to the stroke kinds it draws with.
 *
 * @param tk - The active tool.
 * @returns Whether the tool draws a free-form stroke.
 */
const isStrokeTool = (tk: WhiteboardTool): tk is WhiteboardStrokeKind =>
  tk === 'pen' || tk === 'marker' || tk === 'eraser'

/**
 * Narrows a tool to the shape kinds it draws with.
 *
 * @param tk - The active tool.
 * @returns Whether the tool draws a vector shape.
 */
const isShapeTool = (tk: WhiteboardTool): tk is WhiteboardShapeKind =>
  tk === 'line' || tk === 'arrow' || tk === 'rect' || tk === 'ellipse'

/**
 * WhiteboardCanvas component.
 *
 * The host IS the pan/zoom surface element (`div[mol-whiteboard-canvas]`),
 * matching React's root (`<CanvasSurface>`'s `<div role="application"
 * data-mol-id="canvas-surface">`) exactly. Pan + zoom are handled here the way
 * the base's `<CanvasSurface>` does it — this component only adds
 * tool-specific pointer-event interpretation and rendering of strokes, shapes,
 * and sticky notes inside the canvas-space inner layer. All styling goes
 * through `getClassMap()`; all user-facing text goes through `t()`.
 *
 * Controlled state model: pass `strokes` / `shapes` / `stickyNotes` and listen
 * for `onChange`. Each completed gesture fires `onChange` with the full
 * post-gesture state.
 */
@Component({
  selector: 'div[mol-whiteboard-canvas]',
  standalone: true,
  inputs: [
    'strokes',
    'shapes',
    'stickyNotes',
    'onChange',
    'tool',
    'strokeColor',
    'strokeWidth',
    'stickyBackground',
    'width',
    'height',
    'initialViewport',
    'viewportLimits',
    'readOnly',
    'ariaLabel',
    'className',
  ],
  host: {
    role: 'application',
    'data-mol-id': 'canvas-surface',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[class]': 'classes()',
    '[style.position]': "'relative'",
    '[style.overflow]': "'hidden'",
    '[style.touch-action]': "'none'",
    '[style.width.px]': 'width',
    '[style.height.px]': 'height',
    '(pointerdown)': 'onSurfacePointerDown($event)',
    '(pointermove)': 'onSurfacePointerMove($event)',
    '(pointerup)': 'endPan($event)',
    '(pointercancel)': 'endPan($event)',
    '(wheel)': 'onWheel($event)',
  },
  template: `<div
    data-mol-id="canvas-surface-inner"
    [attr.data-canvas-zoom]="viewport().zoom"
    [attr.data-canvas-x]="viewport().x"
    [attr.data-canvas-y]="viewport().y"
    [style.position]="'absolute'"
    [style.top]="'0px'"
    [style.left]="'0px'"
    [style.transform-origin]="'0 0'"
    [style.transform]="innerTransform()"
    [style.width]="'0px'"
    [style.height]="'0px'"
  >
    <div
      #toolLayer
      data-mol-id="whiteboard-canvas-tool-layer"
      [attr.data-whiteboard-tool]="tool"
      [style.position]="'absolute'"
      [style.inset]="'0px'"
      [style.pointer-events]="toolPointerEvents()"
      (pointerdown)="onInnerPointerDown($event)"
      (pointermove)="onInnerPointerMove($event)"
      (pointerup)="finishGesture($event)"
      (pointercancel)="finishGesture($event)"
    >
      <svg
        data-mol-id="whiteboard-canvas-svg"
        [attr.width]="width"
        [attr.height]="height"
        [style.position]="'absolute'"
        [style.top]="'0px'"
        [style.left]="'0px'"
        [style.overflow]="'visible'"
        [style.pointer-events]="'none'"
      >
        @for (shape of renderShapes(); track shape.id) {
          @if (shape.kind === 'rect') {
            <rect
              data-mol-id="whiteboard-canvas-shape"
              [attr.data-shape-kind]="shape.kind"
              [attr.x]="bounds(shape).x"
              [attr.y]="bounds(shape).y"
              [attr.width]="bounds(shape).width"
              [attr.height]="bounds(shape).height"
              [attr.stroke]="shape.stroke"
              [attr.stroke-width]="shape.strokeWidth"
              [attr.fill]="shape.fill ?? 'none'"
            ></rect>
          } @else if (shape.kind === 'ellipse') {
            <ellipse
              data-mol-id="whiteboard-canvas-shape"
              [attr.data-shape-kind]="shape.kind"
              [attr.cx]="bounds(shape).x + bounds(shape).width / 2"
              [attr.cy]="bounds(shape).y + bounds(shape).height / 2"
              [attr.rx]="bounds(shape).width / 2"
              [attr.ry]="bounds(shape).height / 2"
              [attr.stroke]="shape.stroke"
              [attr.stroke-width]="shape.strokeWidth"
              [attr.fill]="shape.fill ?? 'none'"
            ></ellipse>
          } @else {
            <path
              data-mol-id="whiteboard-canvas-shape"
              [attr.data-shape-kind]="shape.kind"
              [attr.d]="shapePath(shape)"
              [attr.stroke]="shape.stroke"
              [attr.stroke-width]="shape.strokeWidth"
              [attr.fill]="'none'"
              [attr.stroke-linecap]="'round'"
              [attr.stroke-linejoin]="'round'"
            ></path>
          }
        }
        @for (stroke of renderStrokes(); track stroke.id) {
          <path
            data-mol-id="whiteboard-canvas-stroke"
            [attr.data-stroke-kind]="stroke.kind"
            [attr.d]="strokePath(stroke)"
            [attr.stroke]="stroke.color"
            [attr.stroke-width]="stroke.width"
            [attr.fill]="'none'"
            [attr.stroke-linecap]="'round'"
            [attr.stroke-linejoin]="'round'"
            [attr.opacity]="stroke.kind === 'eraser' ? 0.4 : 1"
          ></path>
        }
      </svg>
      @for (note of stickyNotes; track note.id) {
        <div
          data-mol-id="whiteboard-canvas-sticky"
          [class]="stickyClasses()"
          [style.position]="'absolute'"
          [style.left.px]="note.position.x"
          [style.top.px]="note.position.y"
          [style.width.px]="note.width"
          [style.height.px]="note.height"
          [style.background]="note.background"
          [style.color]="note.color"
          [style.padding]="'8px'"
          [style.box-sizing]="'border-box'"
          [style.white-space]="'pre-wrap'"
          [style.overflow]="'hidden'"
          [style.pointer-events]="'none'"
          [textContent]="note.text"
        ></div>
      }
    </div>
  </div>`,
})
export class WhiteboardCanvas implements OnInit {
  /** Free-form strokes (pen / marker / eraser) currently on the board. */
  strokes: WhiteboardStroke[] = []
  /** Vector shapes on the board. */
  shapes: WhiteboardShape[] = []
  /** Sticky notes / text boxes on the board. */
  stickyNotes: WhiteboardStickyNote[] = []
  /** Called when a gesture mutates the board (React's `onChange`). */
  onChange?: (change: WhiteboardChange) => void
  /** Active drawing tool. */
  tool: WhiteboardTool = 'pen'
  /** Optional override for in-flight stroke color. */
  strokeColor?: string
  /** Optional override for stroke width. */
  strokeWidth?: number
  /** Optional sticky-note background override. */
  stickyBackground?: string
  /** Surface width in CSS pixels. */
  width!: number
  /** Surface height in CSS pixels. */
  height!: number
  /** Optional initial viewport (read once, like React's `useState` seed). */
  initialViewport?: CanvasViewport
  /** Optional viewport clamping limits. */
  viewportLimits?: ViewportLimits
  /** If true, every drawing tool is disabled (background pan still works). */
  readOnly?: boolean
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string

  /** The host element (this component's root), for pointer coordinates. */
  private readonly host = inject<ElementRef<HTMLDivElement>>(ElementRef)
  /** Reactive translation. */
  private readonly i18n = useTranslation()

  /** The tool layer element, the gesture target React measures from. */
  @ViewChild('toolLayer') private toolLayer?: ElementRef<HTMLDivElement>

  /** The viewport (React's `useState`). */
  private readonly viewportState = signal<CanvasViewport>(DEFAULT_VIEWPORT)
  /** Active in-flight stroke (pen / marker / eraser). */
  private readonly activeStroke = signal<WhiteboardStroke | null>(null)
  /** Active in-flight shape (line / arrow / rect / ellipse). */
  private readonly activeShape = signal<WhiteboardShape | null>(null)

  /** Pointer id of the active text gesture (null = none). */
  private activePointerId: number | null = null
  /** Pointer id of the active pan gesture (null = no active pan). */
  private panPointerId: number | null = null
  /** Last screen-space position seen during the active pan. */
  private lastScreen: { x: number; y: number } | null = null

  /**
   * Seeds the viewport from the initial one, once (React's `useState` seed):
   * inputs are set before this hook runs.
   */
  ngOnInit(): void {
    this.viewportState.set(this.initialViewport ?? DEFAULT_VIEWPORT)
  }

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The current viewport.
   *
   * @returns The viewport.
   */
  viewport(): CanvasViewport {
    return this.viewportState()
  }

  /**
   * Computes the wrapper class list (the base surface's plus the caller's).
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.cm().surfaceSecondary, this.className)
  }

  /**
   * The sticky note's class list (React's `cm.cn(cm.position('absolute'))`).
   *
   * @returns The class string.
   */
  stickyClasses(): string {
    return this.cm().cn(this.cm().position('absolute'))
  }

  /**
   * The inner layer's transform (canvas-space children).
   *
   * @returns The CSS transform string.
   */
  innerTransform(): string {
    const vp = this.viewport()
    return `scale(${vp.zoom}) translate(${-vp.x}px, ${-vp.y}px)`
  }

  /**
   * The tool layer's `pointer-events` (only an active tool intercepts).
   *
   * @returns `'none'` or `'auto'`.
   */
  toolPointerEvents(): string {
    return this.tool === 'select' || this.readOnly ? 'none' : 'auto'
  }

  /**
   * The accessible name of the surface.
   *
   * @returns The label.
   */
  resolvedAriaLabel(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('whiteboard.aria.canvas', {}, { defaultValue: 'Whiteboard canvas' })
    )
  }

  /**
   * All committed strokes plus the in-flight stroke for live preview.
   *
   * @returns The strokes to render.
   */
  renderStrokes(): WhiteboardStroke[] {
    const active = this.activeStroke()
    return active ? [...this.strokes, active] : this.strokes
  }

  /**
   * All committed shapes plus the in-flight shape for live preview.
   *
   * @returns The shapes to render.
   */
  renderShapes(): WhiteboardShape[] {
    const active = this.activeShape()
    return active ? [...this.shapes, active] : this.shapes
  }

  /**
   * The axis-aligned bounds of a shape.
   *
   * @param shape - The shape.
   * @returns Its canvas-space bounds.
   */
  bounds(shape: WhiteboardShape): { x: number; y: number; width: number; height: number } {
    return shapeBounds(shape)
  }

  /**
   * The SVG path data of a line / arrow shape.
   *
   * @param shape - The shape.
   * @returns Its path data.
   */
  shapePath(shape: WhiteboardShape): string {
    return buildShapePath(shape)
  }

  /**
   * The SVG path data of a free-form stroke.
   *
   * @param stroke - The stroke.
   * @returns Its path data.
   */
  strokePath(stroke: WhiteboardStroke): string {
    return buildStrokePath(stroke.points)
  }

  /**
   * Translate a raw pointer event into canvas-space using the surface's inner
   * layer as the screen-space reference (see React's `eventToCanvas`).
   *
   * @param e - The pointer event.
   * @returns The point in canvas-space.
   */
  private eventToCanvas(e: PointerEvent): { x: number; y: number } {
    const el = this.toolLayer?.nativeElement
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    // Use the parent surface (React's `innerRef.current.parentElement`) as
    // the screen-space origin; the inner layer's rect is offset/scaled by
    // the current viewport transform, but its parent's is not.
    const surfaceEl = el.parentElement ?? el
    const surfaceRect = surfaceEl.getBoundingClientRect()
    const screenPoint = {
      x: e.clientX - surfaceRect.left,
      y: e.clientY - surfaceRect.top,
    }
    // The tool layer carries no data-canvas-* attrs, so — like React — this
    // falls back to the component's viewport state.
    const vp = this.viewport()
    const innerZoom = Number(el.dataset.canvasZoom ?? vp.zoom) || 1
    const innerX = Number(el.dataset.canvasX ?? vp.x) || 0
    const innerY = Number(el.dataset.canvasY ?? vp.y) || 0
    // Kept for the reflow read React performs at the same spot.
    void rect
    return screenToCanvas(screenPoint, { x: innerX, y: innerY, zoom: innerZoom })
  }

  /**
   * Starts a gesture on the tool layer: stroke / shape drafts commit on
   * pointer up; sticky notes commit here.
   *
   * @param e - The pointerdown event.
   */
  onInnerPointerDown(e: PointerEvent): void {
    if (this.readOnly) return
    if (this.tool === 'select') return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    // Block surface pan for our active gesture.
    e.stopPropagation()
    this.activePointerId = e.pointerId
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom can throw — safe to ignore. */
    }
    const point = this.eventToCanvas(e)

    if (isStrokeTool(this.tool)) {
      this.activeStroke.set({
        id: generateWhiteboardId(),
        kind: this.tool,
        points: [point],
        color: this.strokeColor ?? defaultStrokeColor(this.tool),
        width: this.strokeWidth ?? defaultStrokeWidth(this.tool),
      })
      return
    }

    if (isShapeTool(this.tool)) {
      const style = defaultShapeStyle(this.tool)
      this.activeShape.set({
        id: generateWhiteboardId(),
        kind: this.tool,
        from: point,
        to: point,
        stroke: this.strokeColor ?? style.stroke,
        strokeWidth: this.strokeWidth ?? style.strokeWidth,
        fill: style.fill,
      })
      return
    }

    if (this.tool === 'sticky' || this.tool === 'text') {
      const sticky = defaultStickyNoteStyle()
      const placeholder = this.i18n.t(
        'whiteboard.stickyNote.placeholder',
        {},
        {
          defaultValue: 'New note',
        },
      )
      const note: WhiteboardStickyNote = {
        id: generateWhiteboardId(),
        position: { x: point.x - sticky.width / 2, y: point.y - sticky.height / 2 },
        width: sticky.width,
        height: sticky.height,
        text: placeholder,
        background:
          this.stickyBackground ?? (this.tool === 'text' ? 'transparent' : sticky.background),
        color: sticky.color,
      }
      this.onChange?.({
        strokes: this.strokes,
        shapes: this.shapes,
        stickyNotes: [...this.stickyNotes, note],
      })
      // Sticky notes are committed on tap-down — no drag needed.
      this.activePointerId = null
    }
  }

  /**
   * Extends the in-flight stroke or shape to the pointer's position.
   *
   * @param e - The pointermove event.
   */
  onInnerPointerMove(e: PointerEvent): void {
    if (this.activePointerId !== e.pointerId) return
    const point = this.eventToCanvas(e)
    const stroke = this.activeStroke()
    if (stroke) {
      this.activeStroke.set({ ...stroke, points: [...stroke.points, point] })
      return
    }
    const shape = this.activeShape()
    if (shape) this.activeShape.set({ ...shape, to: point })
  }

  /**
   * Commits the in-flight stroke or shape (or discards a zero-size shape) and
   * releases the pointer.
   *
   * @param e - The pointerup or pointercancel event.
   */
  finishGesture(e: PointerEvent): void {
    if (this.activePointerId !== e.pointerId) return
    this.activePointerId = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom — safe to ignore. */
    }
    const stroke = this.activeStroke()
    if (stroke) {
      // Commit the stroke even if it's a single tap (1 point) — that
      // represents a dot mark.
      const next = [...this.strokes, stroke]
      this.activeStroke.set(null)
      this.onChange?.({ strokes: next, shapes: this.shapes, stickyNotes: this.stickyNotes })
      return
    }
    const shape = this.activeShape()
    if (shape) {
      const b = shapeBounds(shape)
      // Drop zero-size shapes (a click without drag).
      if (b.width < 1 && b.height < 1) {
        this.activeShape.set(null)
        return
      }
      const next = [...this.shapes, shape]
      this.activeShape.set(null)
      this.onChange?.({ strokes: this.strokes, shapes: next, stickyNotes: this.stickyNotes })
    }
  }

  /**
   * Replaces the viewport (clamped to the limits), as the base surface does.
   *
   * @param next - The desired viewport.
   */
  private setViewport(next: CanvasViewport): void {
    this.viewportState.set(clampViewport(next, this.viewportLimits))
  }

  /**
   * Pans by a screen-space delta, interpreted through the current zoom.
   *
   * @param deltaX - Screen-space x delta.
   * @param deltaY - Screen-space y delta.
   */
  private panBy(deltaX: number, deltaY: number): void {
    const vp = this.viewport()
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    this.setViewport({ x: vp.x - deltaX / safeZoom, y: vp.y - deltaY / safeZoom, zoom: vp.zoom })
  }

  /**
   * Zooms around a screen-space focal point, holding its canvas-space position.
   *
   * @param factor - Zoom multiplier (> 1 zooms in).
   * @param focalScreenX - Focal x in screen space.
   * @param focalScreenY - Focal y in screen space.
   */
  private zoomBy(factor: number, focalScreenX: number, focalScreenY: number): void {
    if (factor <= 0) return
    const vp = this.viewport()
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    const focalCanvasX = focalScreenX / safeZoom + vp.x
    const focalCanvasY = focalScreenY / safeZoom + vp.y
    const nextZoom = vp.zoom * factor
    this.setViewport({
      x: focalCanvasX - focalScreenX / nextZoom,
      y: focalCanvasY - focalScreenY / nextZoom,
      zoom: nextZoom,
    })
  }

  /**
   * Handles a surface pointer-down: background pan only (children keep their
   * own gestures), exactly as the base `<CanvasSurface>` does.
   *
   * @param event - The pointer event.
   */
  onSurfacePointerDown(event: PointerEvent): void {
    // Only react to gestures on the surface itself, not on children.
    if (event.target !== event.currentTarget) return
    if (event.button !== 0 && event.pointerType === 'mouse') return
    this.panPointerId = event.pointerId
    this.lastScreen = { x: event.clientX, y: event.clientY }
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the pan still works without it.
    }
  }

  /**
   * Pans by the delta since the previous move of the active gesture.
   *
   * @param event - The pointer event.
   */
  onSurfacePointerMove(event: PointerEvent): void {
    if (this.panPointerId !== event.pointerId) return
    const last = this.lastScreen
    if (!last) return
    const dx = event.clientX - last.x
    const dy = event.clientY - last.y
    this.lastScreen = { x: event.clientX, y: event.clientY }
    this.panBy(dx, dy)
  }

  /**
   * Ends the active pan gesture (pointer-up or pointer-cancel).
   *
   * @param event - The pointer event.
   */
  endPan(event: PointerEvent): void {
    if (this.panPointerId !== event.pointerId) return
    this.panPointerId = null
    this.lastScreen = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
  }

  /**
   * Zooms around the cursor on a wheel tick.
   *
   * @param event - The wheel event.
   */
  onWheel(event: WheelEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect()
    if (!rect) return
    const focalX = event.clientX - rect.left
    const focalY = event.clientY - rect.top
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    this.zoomBy(factor, focalX, focalY)
  }
}
