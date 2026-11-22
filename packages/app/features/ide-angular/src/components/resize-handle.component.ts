/**
 * Drag handle for resizing panels.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ResizeHandle` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. The host element IS React's root
 * `div` (an attribute selector), so the handle's own attributes, classes and
 * inline style sit on it through host bindings and the wrapped line is the
 * template's only child. Pointer Events drive the drag (mouse, touch, pen
 * alike) with the pointer captured so moves keep arriving when the cursor
 * leaves the handle; a wide invisible grab zone wraps a thin visible line that
 * brightens to the primary color on hover or drag; the arrow keys nudge the
 * split. A focusable separator is the WAI-ARIA window-splitter pattern, so it
 * reports the leading pane's share of the two panes it divides (`value`)
 * through `aria-valuenow`, with the `0`–`100` range.
 *
 * The hover highlight binds to `pointerover`/`pointerout` — the boundary pair
 * a browser delivers when the pointer enters or leaves the handle, and the
 * events React itself derives `onPointerEnter`/`onPointerLeave` from — so a
 * crossing INTO the wrapped line (`pointerout` with the pointer still inside)
 * reads as staying, not leaving.
 *
 * Derived values are methods the template reads, so each change-detection pass
 * renders the current state the way React's render does. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are geometry the ClassMap
 * can't express, serialized through `styleText` the way React writes numbers
 * (`11` → `11px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/**
 * Width (px) of the invisible grab zone — far wider than the visible line so it
 * is a comfortable target for both a mouse and a finger (WCAG 2.5.5).
 */
const GRAB_PX = 11
/** Visible line thickness (px) at rest. */
const LINE_PX = 1
/** Visible line thickness (px) while hovered or actively dragging. */
const LINE_ACTIVE_PX = 3
/** Pixels moved per arrow-key press for keyboard resize. */
const KEYBOARD_STEP_PX = 24

/**
 * Draggable handle for resizing adjacent panels: it splits two panels along
 * `direction` and reports every drag move through `onResize`.
 */
@Component({
  selector: 'div[mol-resize-handle]',
  standalone: true,
  inputs: ['onResize', 'direction', 'className', 'value'],
  host: {
    'data-mol-id': 'workspace-resize-handle',
    role: 'separator',
    '[attr.aria-orientation]': 'horizontal ? "vertical" : "horizontal"',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'valueNow',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.tabindex]': '0',
    '[class]': 'rootClass()',
    '[attr.style]': 'rootStyle()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
    '(pointerover)': 'onPointerOver($event)',
    '(pointerout)': 'onPointerOut($event)',
    '(keydown)': 'onKeyDown($event)',
  },
  // prettier-ignore
  template: `<div aria-hidden="true" [class]="lineClass()" [attr.style]="lineStyle()"></div>`,
})
export class ResizeHandle {
  /** Called with the pixels moved since the last move while dragging. */
  onResize: (delta: number) => void = () => {}

  /** Which axis the handle splits. */
  direction: 'horizontal' | 'vertical' = 'horizontal'

  /** Extra classes from the host, on the grab zone. */
  className?: string

  /**
   * The size, in percent, of the pane BEFORE the handle within the two panes
   * it divides (`lead / (lead + trail) * 100`). A focusable separator is the
   * WAI-ARIA window-splitter pattern, so it requires `aria-valuenow`.
   */
  value = 0

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the host's label binding. */
  protected readonly t = this.i18n.t

  // The drag state is both the render's highlight and the move handler's guard
  // (a template-read field for the view, a plain flag for the guard, exactly
  // React's `dragging` state + `draggingRef`).
  /** Whether a drag is on (the line highlights for it). */
  protected dragging = false

  /** The plain flag the move handler guards with (React's `draggingRef`). */
  private draggingLive = false

  /** Whether the pointer is over the handle (the line highlights for it). */
  protected hovered = false

  /** The pointer position where the drag started, along the handle's axis. */
  private start = 0

  /**
   * Whether the handle splits left/right (React's `direction` default).
   * @returns True for the horizontal axis.
   */
  protected get horizontal(): boolean {
    return this.direction === 'horizontal'
  }

  /**
   * Whether the line is brightened (dragging or hovered).
   * @returns True when the primary colour shows.
   */
  protected get highlighted(): boolean {
    return this.dragging || this.hovered
  }

  /**
   * The separator's reported value (React rounds it into the attribute).
   * @returns The leading pane's share, rounded to a whole percent.
   */
  protected get valueNow(): number {
    return Math.round(this.value)
  }

  /**
   * The handle's accessible name.
   * @returns The translated label.
   */
  protected label(): string {
    return this.t('ide.resizeHandle.label', undefined, { defaultValue: 'Resize panels' })
  }

  /**
   * The grab zone's classes: the centered column, the no-shrink token and the
   * host's extra classes, composed exactly as React composes them.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
      this.cm.shrink0,
      this.className,
    )
  }

  /**
   * The grab zone's inline style: the comfortable touch target collapsed to
   * the visible line with symmetric negative margins, raised above the panes
   * so its overflow stays grabbable.
   * @returns The style attribute text.
   */
  protected rootStyle(): string | null {
    const inset = `-${(GRAB_PX - LINE_PX) / 2}px`
    return styleText(
      this.horizontal
        ? {
            cursor: 'col-resize',
            touchAction: 'none',
            position: 'relative',
            zIndex: 1,
            width: GRAB_PX,
            height: '100%',
            marginLeft: inset,
            marginRight: inset,
          }
        : {
            cursor: 'row-resize',
            touchAction: 'none',
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: GRAB_PX,
            marginTop: inset,
            marginBottom: inset,
          },
    )
  }

  /**
   * The visible line's class: the theme's primary colour while highlighted,
   * the border colour at rest.
   * @returns The resolved class string.
   */
  protected lineClass(): string {
    return this.cm.cn(this.highlighted ? this.cm.bgPrimary : this.cm.bgBorder)
  }

  /**
   * The visible line's inline style: the highlighted thickness along the
   * handle's axis, full across it, with the smooth token/thickness swap.
   * @returns The style attribute text.
   */
  protected lineStyle(): string | null {
    const thickness = this.highlighted ? `${LINE_ACTIVE_PX}px` : `${LINE_PX}px`
    return styleText({
      width: this.horizontal ? thickness : '100%',
      height: this.horizontal ? '100%' : thickness,
      borderRadius: 9999,
      transition: 'background-color 150ms ease, width 150ms ease, height 150ms ease',
    })
  }

  /**
   * Starts a drag: remembers the pointer, captures it so moves keep firing
   * when the cursor leaves the handle, and pins the page against scroll and
   * text selection while the drag is on.
   * @param event - The native pointer event.
   */
  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault()
    this.draggingLive = true
    this.dragging = true
    this.start = this.horizontal ? event.clientX : event.clientY
    const el = event.currentTarget as HTMLDivElement
    el.setPointerCapture(event.pointerId)
    document.body.style.cursor = this.horizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  /**
   * Drags: every move calls `onResize` with the pixels moved since the last
   * move (a move that lands where the last one did is no move at all).
   * @param event - The native pointer event.
   */
  protected onPointerMove(event: PointerEvent): void {
    if (!this.draggingLive) return
    const current = this.horizontal ? event.clientX : event.clientY
    const delta = current - this.start
    if (delta === 0) return
    this.start = current
    this.onResize(delta)
  }

  /**
   * Ends a drag (release or cancel), lets the capture go and restores the page
   * the way the drag start found it.
   * @param event - The native pointer event.
   */
  protected onPointerUp(event: PointerEvent): void {
    this.endDrag(event)
  }

  /**
   * Ends a drag (release or cancel), lets the capture go and restores the page
   * the way the drag start found it.
   * @param event - The native pointer event.
   */
  protected onPointerCancel(event: PointerEvent): void {
    this.endDrag(event)
  }

  /**
   * The shared drag end: drops the guard and the highlight, lets the capture
   * go and restores the page.
   * @param event - The native pointer event.
   */
  private endDrag(event: PointerEvent): void {
    if (!this.draggingLive) return
    this.draggingLive = false
    this.dragging = false
    const el = event.currentTarget as HTMLDivElement
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  /**
   * Keyboard resize: the arrows nudge along the handle's axis (left/up
   * shrink, right/down grow); every other key passes through untouched.
   * @param event - The native keyboard event.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    const decreaseKey = this.horizontal ? 'ArrowLeft' : 'ArrowUp'
    const increaseKey = this.horizontal ? 'ArrowRight' : 'ArrowDown'
    if (event.key === decreaseKey) {
      event.preventDefault()
      this.onResize(-KEYBOARD_STEP_PX)
    } else if (event.key === increaseKey) {
      event.preventDefault()
      this.onResize(KEYBOARD_STEP_PX)
    }
  }

  /**
   * Highlights the line while the pointer is over the handle (a crossing into
   * the wrapped line is not a leave — see the module note).
   * @param event - The native pointer event.
   */
  protected onPointerOver(event: PointerEvent): void {
    const el = event.currentTarget as HTMLDivElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.hovered = true
  }

  /**
   * Restores the line once the pointer has actually left the handle.
   * @param event - The native pointer event.
   */
  protected onPointerOut(event: PointerEvent): void {
    const el = event.currentTarget as HTMLDivElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.hovered = false
  }
}
