/**
 * CanvasNode component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { CanvasDragInfo, CanvasItemId, CanvasResizeInfo, Point, Size } from './types.js'

/** One mounted node's generated id counter (React's `useId()`). */
let nextDescriptionId = 0

/**
 * Read the canvas zoom from the nearest surface ancestor (defaults to 1).
 *
 * @param el - The element the gesture runs on.
 * @returns The surface zoom, or 1 when no ancestor carries one.
 */
function readSurfaceZoom(el: Element | null): number {
  let cur: Element | null = el
  while (cur) {
    const z = cur.getAttribute?.('data-canvas-zoom')
    if (z != null) {
      const parsed = parseFloat(z)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    cur = cur.parentElement
  }
  return 1
}

/**
 * CanvasNode component.
 *
 * Generic positioned + draggable + resizable wrapper. The host IS the node
 * (`div[mol-canvas-node]`), matching React's root exactly. It owns absolute
 * positioning at `position` (canvas units), an optional explicit `size`,
 * `onSelect` on a press that never moved, `onDrag` from any press on the node
 * body, and `onResize` from a SE-corner handle (rendered only when `onResize`
 * is supplied). It does NOT own visual chrome — wrappers compose chrome on top
 * with projected content.
 *
 * Accessibility: the host renders as `role="group"` named by `aria-label`.
 * `aria-selected` is not valid on a group, and the selectable roles need a
 * listbox, grid or tree parent the `role="application"` surface is not; a
 * selected node is therefore described by a hidden "Selected" text through
 * `aria-describedby`.
 */
@Component({
  selector: 'div[mol-canvas-node]',
  standalone: true,
  inputs: [
    'id',
    'position',
    'size',
    'selected',
    'onSelect',
    'onDrag',
    'onResize',
    'ariaLabel',
    'className',
  ],
  host: {
    '[attr.role]': "'group'",
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-describedby]': 'selected ? descriptionId : null',
    '[attr.data-mol-id]': "id ? 'canvas-node-' + id : 'canvas-node'",
    '[attr.data-canvas-node-id]': 'id ?? null',
    '[attr.data-selected]': "selected ? 'true' : null",
    '[class]': 'classes()',
    '[style.position]': "'absolute'",
    '[style.left]': 'leftPx()',
    '[style.top]': 'topPx()',
    '[style.width]': 'widthPx()',
    '[style.height]': 'heightPx()',
    '[style.touch-action]': "'none'",
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
  },
  template: `<ng-content></ng-content>
    @if (selected) {
      <span [attr.id]="descriptionId" hidden>{{ selectedLabel() }}</span>
    }
    @if (onResize && size) {
      <div
        role="button"
        [attr.aria-label]="handleLabel()"
        [attr.data-mol-id]="handleMolId()"
        [style.position]="'absolute'"
        [style.right]="'0px'"
        [style.bottom]="'0px'"
        [style.width]="'12px'"
        [style.height]="'12px'"
        [style.cursor]="'se-resize'"
        [style.touch-action]="'none'"
        (pointerdown)="onResizePointerDown($event)"
        (pointermove)="onResizePointerMove($event)"
        (pointerup)="onResizePointerUp($event)"
        (pointercancel)="onResizePointerUp($event)"
      ></div>
    }`,
})
export class CanvasNode {
  /** Optional id, surfaced on `data-canvas-node-id` and via `onSelect`. */
  id?: CanvasItemId
  /** Canvas-space top-left position of the node. */
  position?: Point
  /** Optional canvas-space size. If omitted, the node sizes to content. */
  size?: Size
  /** Whether the node is currently selected. */
  selected?: boolean
  /** Called when a press that never moved activates the node. */
  onSelect?: (id: CanvasItemId | undefined, e: PointerEvent) => void
  /** Called continuously during a drag gesture. */
  onDrag?: (info: CanvasDragInfo) => void
  /** Called continuously during a resize gesture from the SE corner. */
  onResize?: (info: CanvasResizeInfo) => void
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string

  /** Reactive translation. */
  private readonly i18n = useTranslation()
  /** This node's generated description id (React's `useId()`). */
  readonly descriptionId = `mol-canvas-node-${nextDescriptionId++}`

  // Drag gesture state.
  private dragPointerId: number | null = null
  private dragLastScreen: { x: number; y: number } | null = null
  private dragPosition: Point = { x: 0, y: 0 }
  private movedDuringGesture = false

  // Resize gesture state.
  private resizePointerId: number | null = null
  private resizeStartScreen: { x: number; y: number } | null = null
  private resizeStartSize: Size | null = null

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
    return this.cm().cn(this.cm().position('absolute'), this.className)
  }

  /**
   * The node's left edge in canvas units.
   *
   * @returns The CSS length.
   */
  leftPx(): string {
    return `${this.position?.x ?? 0}px`
  }

  /**
   * The node's top edge in canvas units.
   *
   * @returns The CSS length.
   */
  topPx(): string {
    return `${this.position?.y ?? 0}px`
  }

  /**
   * The node's width, or `null` (no style) without a size.
   *
   * @returns The CSS length.
   */
  widthPx(): string | null {
    return this.size ? `${this.size.width}px` : null
  }

  /**
   * The node's height, or `null` (no style) without a size.
   *
   * @returns The CSS length.
   */
  heightPx(): string | null {
    return this.size ? `${this.size.height}px` : null
  }

  /**
   * The accessible name of the node.
   *
   * @returns The label.
   */
  resolvedAriaLabel(): string {
    return this.ariaLabel ?? this.i18n.t('canvas.aria.node', {}, { defaultValue: 'Canvas node' })
  }

  /**
   * The accessible name of the resize handle.
   *
   * @returns The label.
   */
  handleLabel(): string {
    return this.i18n.t('canvas.aria.resizeHandle', {}, { defaultValue: 'Resize node' })
  }

  /**
   * The hidden description a selected node is named by.
   *
   * @returns The text.
   */
  selectedLabel(): string {
    return this.i18n.t('canvas.aria.nodeSelected', {}, { defaultValue: 'Selected' })
  }

  /**
   * The resize handle's agent selector.
   *
   * @returns The `data-mol-id` value.
   */
  handleMolId(): string {
    return this.id ? `canvas-node-resize-handle-${this.id}` : 'canvas-node-resize-handle'
  }

  /**
   * Starts a drag gesture (or a selection press) on the node body.
   *
   * @param event - The pointer event.
   */
  onPointerDown(event: PointerEvent): void {
    // Block surface pan.
    event.stopPropagation()
    if (event.button !== 0 && event.pointerType === 'mouse') return
    this.dragPointerId = event.pointerId
    this.dragLastScreen = { x: event.clientX, y: event.clientY }
    this.dragPosition = this.position ?? { x: 0, y: 0 }
    this.movedDuringGesture = false
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the drag still works without it.
    }
  }

  /**
   * Reports each drag tick in canvas-space.
   *
   * @param event - The pointer event.
   */
  onPointerMove(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return
    const last = this.dragLastScreen
    if (!last) return
    const zoom = readSurfaceZoom(event.currentTarget as Element) || 1
    const dx = (event.clientX - last.x) / zoom
    const dy = (event.clientY - last.y) / zoom
    if (dx === 0 && dy === 0) return
    this.dragLastScreen = { x: event.clientX, y: event.clientY }
    const next: Point = { x: this.dragPosition.x + dx, y: this.dragPosition.y + dy }
    const start = !this.movedDuringGesture
    this.movedDuringGesture = true
    this.dragPosition = next
    this.onDrag?.({ position: next, delta: { x: dx, y: dy }, start, end: false })
  }

  /**
   * Ends the drag: reports the final delta, or selects the node when the
   * gesture never moved.
   *
   * @param event - The pointer event.
   */
  onPointerUp(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return
    this.dragPointerId = null
    this.dragLastScreen = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
    if (this.movedDuringGesture) {
      this.onDrag?.({ position: this.dragPosition, delta: { x: 0, y: 0 }, start: false, end: true })
    } else {
      this.onSelect?.(this.id, event)
    }
    this.movedDuringGesture = false
  }

  /**
   * Starts a resize gesture from the SE handle.
   *
   * @param event - The pointer event.
   */
  onResizePointerDown(event: PointerEvent): void {
    event.stopPropagation()
    const size = this.size
    if (!this.onResize || !size) return
    if (event.button !== 0 && event.pointerType === 'mouse') return
    this.resizePointerId = event.pointerId
    this.resizeStartScreen = { x: event.clientX, y: event.clientY }
    this.resizeStartSize = { width: size.width, height: size.height }
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the resize still works without it.
    }
  }

  /**
   * Reports each resize tick in canvas-space.
   *
   * @param event - The pointer event.
   */
  onResizePointerMove(event: PointerEvent): void {
    if (this.resizePointerId !== event.pointerId) return
    if (!this.onResize) return
    const start = this.resizeStartScreen
    const startSize = this.resizeStartSize
    if (!start || !startSize) return
    const zoom = readSurfaceZoom(event.currentTarget as Element) || 1
    const dx = (event.clientX - start.x) / zoom
    const dy = (event.clientY - start.y) / zoom
    this.onResize({
      position: this.position ?? { x: 0, y: 0 },
      size: {
        width: Math.max(0, startSize.width + dx),
        height: Math.max(0, startSize.height + dy),
      },
      end: false,
    })
  }

  /**
   * Ends the resize gesture.
   *
   * @param event - The pointer event.
   */
  onResizePointerUp(event: PointerEvent): void {
    if (this.resizePointerId !== event.pointerId) return
    this.resizePointerId = null
    const startSize = this.resizeStartSize
    this.resizeStartScreen = null
    this.resizeStartSize = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
    if (this.onResize && startSize)
      this.onResize({
        position: this.position ?? { x: 0, y: 0 },
        size: this.size ?? startSize,
        end: true,
      })
  }
}
