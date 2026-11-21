/**
 * CanvasSurface component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, type OnInit } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { clampViewport } from './coordinates.js'
import type { CanvasViewport, ViewportLimits } from './types.js'

/** The viewport an uncontrolled surface starts from (React's `useState` default). */
const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 }

/**
 * CanvasSurface component.
 *
 * Pan/zoom container — the shared base every canvas variant builds on. The host
 * IS the outer `<div>` (`div[mol-canvas-surface]`), matching React's root
 * exactly. Wheel scroll zooms around the cursor; primary-button drag on the
 * empty surface pans; children render inside a CSS-transformed inner layer so
 * they live in canvas-coordinate-space. Children that handle their own pointer
 * gestures should stop propagation on pointerdown to suppress surface pan.
 *
 * Children are projected content: everything inside the host lands in the
 * inner canvas-space layer.
 */
@Component({
  selector: 'div[mol-canvas-surface]',
  standalone: true,
  inputs: [
    'viewport',
    'initialViewport',
    'onViewportChange',
    'limits',
    'zoomFactor',
    'panOnDrag',
    'onBackgroundPointerDown',
    'width',
    'height',
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
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'endPan($event)',
    '(pointercancel)': 'endPan($event)',
    '(wheel)': 'onWheel($event)',
  },
  template: `<div
    data-mol-id="canvas-surface-inner"
    [attr.data-canvas-zoom]="currentViewport().zoom"
    [attr.data-canvas-x]="currentViewport().x"
    [attr.data-canvas-y]="currentViewport().y"
    [style.position]="'absolute'"
    [style.top]="'0px'"
    [style.left]="'0px'"
    [style.transform-origin]="'0 0'"
    [style.transform]="innerTransform()"
    [style.width]="'0px'"
    [style.height]="'0px'"
  >
    <ng-content></ng-content>
  </div>`,
})
export class CanvasSurface implements OnInit {
  /** Controlled viewport; omit it for an uncontrolled surface. */
  viewport?: CanvasViewport
  /** Initial viewport (uncontrolled mode only, read once). */
  initialViewport?: CanvasViewport
  /** Called whenever the viewport changes. */
  onViewportChange?: (next: CanvasViewport) => void
  /** Optional clamping limits applied on every viewport update. */
  limits?: ViewportLimits
  /** Wheel-zoom factor per scroll tick (defaults to `1.1` at read time). */
  zoomFactor?: number
  /** Whether dragging the empty surface pans (React's default `true`). */
  panOnDrag?: boolean
  /** Called when an empty-area pointerdown fires. */
  onBackgroundPointerDown?: (e: PointerEvent) => void
  /** Width of the surface in CSS pixels. */
  width?: number
  /** Height of the surface in CSS pixels. */
  height?: number
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** The host element (this component's root), for pointer coordinates. */
  private readonly host = inject<ElementRef<HTMLDivElement>>(ElementRef)
  /** Reactive translation. */
  private readonly i18n = useTranslation()

  /** The uncontrolled viewport (React's `useState` seed, read once). */
  private internal: CanvasViewport = DEFAULT_VIEWPORT

  /** Pointer id of the active pan gesture (null = no active pan). */
  private panPointerId: number | null = null
  /** Last screen-space position seen during the active pan. */
  private lastScreen: { x: number; y: number } | null = null

  /**
   * Seeds the uncontrolled viewport from the initial one, once (React's
   * `useRef` seed): inputs are set before this hook runs.
   */
  ngOnInit(): void {
    this.internal = this.initialViewport ?? DEFAULT_VIEWPORT
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
   * Computes the wrapper class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.cm().surfaceSecondary, this.className)
  }

  /**
   * The accessible name of the surface.
   *
   * @returns The label.
   */
  resolvedAriaLabel(): string {
    return (
      this.ariaLabel ?? this.i18n.t('canvas.aria.surface', {}, { defaultValue: 'Canvas surface' })
    )
  }

  /**
   * The viewport in effect: the controlled one, or the internal state.
   *
   * @returns The current viewport.
   */
  currentViewport(): CanvasViewport {
    return this.viewport ?? this.internal
  }

  /**
   * The inner layer's transform (canvas-space children).
   *
   * @returns The CSS transform string.
   */
  innerTransform(): string {
    const vp = this.currentViewport()
    return `scale(${vp.zoom}) translate(${-vp.x}px, ${-vp.y}px)`
  }

  /**
   * Replaces the viewport (clamped), reports it, and keeps it when uncontrolled.
   *
   * @param next - The desired viewport.
   */
  setViewport(next: CanvasViewport): void {
    const clamped = clampViewport(next, this.limits)
    this.onViewportChange?.(clamped)
    if (this.viewport === undefined) this.internal = clamped
  }

  /**
   * Pans by a screen-space delta, interpreted through the current zoom.
   *
   * @param deltaX - Screen-space x delta.
   * @param deltaY - Screen-space y delta.
   */
  panBy(deltaX: number, deltaY: number): void {
    const vp = this.currentViewport()
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    this.setViewport({
      x: vp.x - deltaX / safeZoom,
      y: vp.y - deltaY / safeZoom,
      zoom: vp.zoom,
    })
  }

  /**
   * Zooms around a screen-space focal point, holding its canvas-space position.
   *
   * @param factor - Zoom multiplier (> 1 zooms in).
   * @param focalScreenX - Focal x in screen space.
   * @param focalScreenY - Focal y in screen space.
   */
  zoomBy(factor: number, focalScreenX: number, focalScreenY: number): void {
    if (factor <= 0) return
    const vp = this.currentViewport()
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
   * Handles a surface pointer-down: background callback, then pan.
   *
   * @param event - The pointer event.
   */
  onPointerDown(event: PointerEvent): void {
    // Only react to gestures on the surface itself, not on children.
    if (event.target !== event.currentTarget) return
    this.onBackgroundPointerDown?.(event)
    if (this.panOnDrag === false) return
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
  onPointerMove(event: PointerEvent): void {
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
    const zoomFactor = this.zoomFactor ?? 1.1
    const factor = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor
    this.zoomBy(factor, focalX, focalY)
  }
}
