/**
 * Tooltip component (React parity): a hover/focus tooltip rendered into a
 * `document.body` portal.
 *
 * @module
 */

import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
  ViewChild,
} from '@angular/core'

import type { TooltipPlacement, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { nextInstanceId } from '../utilities/ids.js'
import { styleText } from '../utilities/style.js'

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

/** Coordinate hover and delayed shows across all tooltip instances in a page. */
const activeTooltips = new WeakMap<Document, () => void>()

/**
 * The arrow's inline position style for a placement (React's `getArrowStyle`).
 *
 * @param placement - The tooltip placement.
 * @returns The style object.
 */
function arrowStyle(placement: TooltipPlacement): Record<string, unknown> {
  const half = ARROW_SIZE / 2
  const base: Record<string, unknown> = {
    position: 'absolute',
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  switch (placement) {
    case 'top':
      return { ...base, bottom: -half, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
    case 'top-start':
      return { ...base, bottom: -half, left: 12, transform: 'rotate(45deg)' }
    case 'top-end':
      return { ...base, bottom: -half, right: 12, transform: 'rotate(45deg)' }
    case 'bottom':
      return { ...base, top: -half, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
    case 'bottom-start':
      return { ...base, top: -half, left: 12, transform: 'rotate(45deg)' }
    case 'bottom-end':
      return { ...base, top: -half, right: 12, transform: 'rotate(45deg)' }
    case 'left':
      return { ...base, right: -half, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
    case 'right':
      return { ...base, left: -half, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
    default:
      return base
  }
}

/** A tooltip position in document space. */
interface Position {
  /** Top offset in pixels. */
  top: number
  /** Left offset in pixels. */
  left: number
}

/**
 * Calculates the tooltip position and clamps it into the viewport (React's
 * `calculatePosition` + clamp, a faithful port).
 *
 * @param triggerRect - The trigger's bounding rectangle.
 * @param tooltipRect - The tooltip's bounding rectangle.
 * @param placement - The tooltip placement.
 * @returns The clamped position.
 */
function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
): Position {
  const { top, left, width, height } = triggerRect
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height
  const offset = 8
  const positions: Record<TooltipPlacement, Position> = {
    top: {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX + width / 2 - tooltipWidth / 2,
    },
    bottom: {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX + width / 2 - tooltipWidth / 2,
    },
    left: {
      top: top + window.scrollY + height / 2 - tooltipHeight / 2,
      left: left + window.scrollX - tooltipWidth - offset,
    },
    right: {
      top: top + window.scrollY + height / 2 - tooltipHeight / 2,
      left: left + window.scrollX + width + offset,
    },
    'top-start': {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX,
    },
    'top-end': {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX + width - tooltipWidth,
    },
    'bottom-start': {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX,
    },
    'bottom-end': {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX + width - tooltipWidth,
    },
  }
  const position = { ...positions[placement] }
  const margin = 8
  const minLeft = window.scrollX + margin
  const maxLeft = window.scrollX + document.documentElement.clientWidth - tooltipRect.width - margin
  const minTop = window.scrollY + margin
  const maxTop =
    window.scrollY + document.documentElement.clientHeight - tooltipRect.height - margin
  position.left = Math.min(Math.max(position.left, minLeft), Math.max(minLeft, maxLeft))
  position.top = Math.min(Math.max(position.top, minTop), Math.max(minTop, maxTop))
  return position
}

/**
 * Tooltip component.
 *
 * React's root is a FRAGMENT (a trigger wrapper `<div>` plus a portal), so
 * the host is unwrapped (`data-parity-unwrap`, `display: contents`); the
 * wrapper is adopted beside the host (so the rendered tree and focus paths
 * match React's) and the portal element is moved into `document.body` while
 * visible. A single-element trigger receives `aria-describedby` while the
 * tooltip shows; show/hide are coordinated across instances exactly like
 * React's module-level `activeTooltips` map.
 */
@Component({
  selector: 'mol-tooltip',
  standalone: true,
  inputs: ['content', 'placement', 'delay', 'hasArrow', 'className', 'style', 'testId'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<div
      #triggerWrap
      [class]="cm().tooltipTrigger"
      (mouseover)="show()"
      (mouseout)="scheduleHide()"
      (focusin)="handleFocus($event)"
      (focusout)="hide()"
      (keydown)="handleKeyDown($event)"
      (click)="hide()"
    >
      <span #childrenCapture><ng-content></ng-content></span>
    </div>
    <div #portalWrap [style]="portalStyleText()">
      <div
        #contentEl
        role="tooltip"
        [id]="tooltipId"
        [class]="contentClasses()"
        [style]="contentStyleText()"
        [attr.data-testid]="testId"
        (mouseover)="keepVisible()"
        (mouseout)="scheduleHide()"
      >
        <ng-content select="[slot=content]"></ng-content>
      </div>
      @if (hasArrow) {
        <span aria-hidden="true" [style]="arrowStyleText()"></span>
      }
    </div>`,
})
export class Tooltip implements AfterViewInit, DoCheck, OnDestroy {
  /** The tooltip content (node-valued prop). */
  content?: unknown
  /** The tooltip placement (default `top`). */
  placement: TooltipPlacement = 'top'
  /** Delay before showing, in ms. */
  delay = 0
  /** Whether the pointer arrow renders. */
  hasArrow = false
  /** Extra classes for the visible tooltip box. */
  className?: string
  /** Inline style object for the visible tooltip box (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the visible tooltip box. */
  testId?: string

  /** The generated tooltip id (the normalizer renumbers it). */
  readonly tooltipId = nextInstanceId()
  /** Whether the tooltip is visible. */
  readonly visible = signal(false)
  /** The current position (React's `{0,0}` initial state). */
  private readonly position = signal<Position>({ top: 0, left: 0 })

  /** The trigger wrapper (adopted beside the host). */
  @ViewChild('triggerWrap') triggerWrap?: ElementRef<HTMLDivElement>
  /** The children capture point. */
  @ViewChild('childrenCapture') childrenCapture?: ElementRef<HTMLSpanElement>
  /** The portal wrapper (moved to `document.body` while visible). */
  @ViewChild('portalWrap') portalWrap?: ElementRef<HTMLDivElement>
  /** The visible tooltip box (measured for positioning). */
  @ViewChild('contentEl') contentEl?: ElementRef<HTMLDivElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly cdr = inject(ChangeDetectorRef)
  private showTimer: ReturnType<typeof setTimeout> | undefined
  private hideTimer: ReturnType<typeof setTimeout> | undefined
  private readonly hideListener = (): void => this.hide()
  private readonly escapeListener = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide()
  }
  private escapeBound = false
  private attached = false
  private lastVisible = false
  private associateEl: HTMLElement | null = null
  private hostParent: Node | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The visible tooltip box's class list.
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().cn(this.cm().tooltipContent, this.className)
  }

  /**
   * Serializes the visible tooltip box's inline style.
   * @returns The style attribute text.
   */
  contentStyleText(): string | null {
    return styleText(this.style)
  }

  /**
   * The portal wrapper's inline style (placement coordinates).
   * @returns The style attribute text.
   */
  portalStyleText(): string | null {
    return styleText({
      position: 'absolute',
      top: this.position().top,
      left: this.position().left,
      zIndex: 9999,
    })
  }

  /**
   * The arrow's inline style.
   * @returns The style attribute text.
   */
  arrowStyleText(): string | null {
    return styleText(arrowStyle(this.placement))
  }

  /**
   * Shows the tooltip (React's `show`): claims the active slot, cancels a
   * previous tooltip, and honours the delay.
   */
  show(): void {
    if (typeof document !== 'undefined') {
      const previous = activeTooltips.get(document)
      if (previous !== this.hideListener) previous?.()
      activeTooltips.set(document, this.hideListener)
    }
    clearTimeout(this.hideTimer)
    clearTimeout(this.showTimer)
    if (this.delay > 0) {
      this.showTimer = setTimeout(() => {
        this.visible.set(true)
        this.cdr.markForCheck()
      }, this.delay)
    } else {
      this.visible.set(true)
      this.cdr.markForCheck()
    }
  }

  /** Hides the tooltip immediately (React's `hide`). */
  hide(): void {
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
    if (typeof document !== 'undefined' && activeTooltips.get(document) === this.hideListener) {
      activeTooltips.delete(document)
    }
    this.visible.set(false)
    this.cdr.markForCheck()
  }

  /** Hides after a grace delay so the pointer can cross into the tooltip. */
  scheduleHide(): void {
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => this.hide(), 150)
  }

  /** Cancels a pending hide while the pointer is over the tooltip. */
  keepVisible(): void {
    clearTimeout(this.hideTimer)
  }

  /**
   * Shows on keyboard focus only (React's `:focus-visible` guard).
   *
   * @param event - The focus event.
   */
  handleFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement
    try {
      if (typeof target.matches === 'function' && target.matches(':focus-visible')) this.show()
    } catch (_error) {
      // :focus-visible unsupported here — do not show on focus; hover applies.
    }
  }

  /**
   * Escape hides a visible tooltip without moving the pointer or focus.
   *
   * @param event - The key event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.hide()
  }

  /**
   * Adopts the trigger wrapper beside the host, moves the projected children
   * into it and records the single-element trigger for `aria-describedby`.
   */
  ngAfterViewInit(): void {
    const wrap = this.triggerWrap?.nativeElement
    const host = this.host.nativeElement
    const capture = this.childrenCapture?.nativeElement
    this.hostParent = host.parentNode
    if (wrap) {
      this.hostParent?.insertBefore(wrap, host)
    }
    if (capture && wrap) {
      const children = Array.from(capture.childNodes)
      for (const node of children) wrap.appendChild(node)
      const elements = children.filter((node) => node.nodeType === 1)
      const hasText = children.some(
        (node) => node.nodeType === 3 && (node.textContent ?? '').trim(),
      )
      this.associateEl = elements.length === 1 && !hasText ? (elements[0] as HTMLElement) : null
      capture.remove()
    }
    // React renders nothing while hidden.
    this.portalWrap?.nativeElement.remove()
    this.attached = false
    this.lastVisible = false
  }

  /** Reconciles visibility (and its portal/focus side effects) each pass. */
  ngDoCheck(): void {
    const visible = this.visible()
    if (visible === this.lastVisible) return
    this.lastVisible = visible
    if (visible) this.attachPortal()
    else this.detachPortal()
  }

  /** Removes listeners/timers and restores the adopted nodes (unmount). */
  ngOnDestroy(): void {
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
    if (typeof document !== 'undefined' && activeTooltips.get(document) === this.hideListener) {
      activeTooltips.delete(document)
    }
    if (this.escapeBound) document.removeEventListener('keydown', this.escapeListener)
    const host = this.host.nativeElement
    const wrap = this.triggerWrap?.nativeElement
    // The adopted nodes must be children of the host again for Angular's own
    // removal to succeed.
    if (wrap && wrap.parentElement !== host) host.appendChild(wrap)
    const portal = this.portalWrap?.nativeElement
    if (portal && portal.parentElement !== host) host.appendChild(portal)
    this.associateEl = null
  }

  /** Attaches the portal to `document.body`, positions it and associates it. */
  private attachPortal(): void {
    const portal = this.portalWrap?.nativeElement
    if (!portal) return
    document.body.appendChild(portal)
    this.attached = true
    this.updatePosition()
    this.associateEl?.setAttribute('aria-describedby', this.tooltipId)
    if (!this.escapeBound) {
      document.addEventListener('keydown', this.escapeListener)
      this.escapeBound = true
    }
  }

  /** Detaches the portal and removes the trigger association. */
  private detachPortal(): void {
    this.portalWrap?.nativeElement.remove()
    this.attached = false
    this.associateEl?.removeAttribute('aria-describedby')
    if (this.escapeBound) {
      document.removeEventListener('keydown', this.escapeListener)
      this.escapeBound = false
    }
  }

  /** Measures the trigger and tooltip and updates the clamped position. */
  private updatePosition(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const trigger = this.triggerWrap?.nativeElement
    const tooltip = this.contentEl?.nativeElement
    if (!trigger || !tooltip) return
    this.position.set(
      calculatePosition(
        trigger.getBoundingClientRect(),
        tooltip.getBoundingClientRect(),
        this.placement,
      ),
    )
  }
}
