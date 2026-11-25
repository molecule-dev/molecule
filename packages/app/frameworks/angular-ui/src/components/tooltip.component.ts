/**
 * Tooltip component (React parity): a hover/focus tooltip rendered into a
 * `document.body` portal.
 *
 * @module
 */

import {
  afterEveryRender,
  type AfterViewChecked,
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

import {
  MolPlacement,
  placeContent,
  placeElement,
  placeElementBefore,
  setElementPresent,
  setHostRoot,
  slotElement,
  usePlacement,
} from '@molecule/app-angular'
import { measureTooltipPosition, OverlayLayer } from '@molecule/app-overlay-dom'
import type { MouseEventHandler, TooltipPlacement, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HasElement } from '../utilities/element.js'
import { nextInstanceId } from '../utilities/ids.js'
import { adoptHostDataMolId } from '../utilities/rest-attrs.js'
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
 * Tooltip component.
 *
 * React's root is a FRAGMENT (a trigger wrapper `<div>` plus a portal), so
 * the trigger wrapper renders in front of the host (`placeElementBefore`),
 * the host itself leaves the DOM, and the portal element renders in
 * `document.body` while visible: the rendered tree and focus paths are
 * React's. A single-element trigger receives `aria-describedby` while the
 * tooltip shows; show/hide are coordinated across instances exactly like
 * React's module-level `activeTooltips` map.
 *
 * Projected content is created with the consumer's view, so a tooltip's `[slot=content]` exists
 * while hidden: its components, effects and fetches run. React mounts it only while shown, and
 * again each time it shows. Write content with state as `*molLazy` (`MolLazy` from
 * `@molecule/app-angular`): it is created when it shows and destroyed when it hides, as React's is.
 *
 * @example
 * ```html
 * <mol-tooltip>
 *   <button mol-button>Usage</button>
 *   <div slot="content" *molLazy><usage-summary /></div>
 * </mol-tooltip>
 * ```
 */
@Component({
  selector: 'mol-tooltip',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'content',
    'placement',
    'delay',
    'hasArrow',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
    'id',
    'title',
    'onDoubleClick',
  ],
  template: `<div
      #triggerWrap
      [class]="cm().tooltipTrigger"
      role="presentation"
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
        [id]="boxId()"
        [class]="contentClasses()"
        [style]="contentStyleText()"
        [attr.data-testid]="testId"
        [attr.data-mol-id]="molId()"
        [attr.title]="title"
        (dblclick)="onDoubleClick?.($event)"
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
export class Tooltip
  implements AfterViewInit, AfterViewChecked, DoCheck, OnDestroy, HasElement<HTMLDivElement>
{
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
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string
  /** The visible box's `id` (React spreads a caller's `id`; it is the `aria-describedby` target). */
  id?: string
  /** The visible box's `title` attribute (React's rest spread). */
  title?: string
  /**
   * A caller's double-click handler on the visible box (React spreads it there).
   *
   * @deprecated Bind `(dblclick)` on the tag: what a caller binds there lands on the box.
   */
  onDoubleClick?: MouseEventHandler

  /** The generated tooltip id (the normalizer renumbers it). */
  readonly tooltipId = nextInstanceId()
  /**
   * The visible box's id: a caller's `id`, else the generated one (React's
   * `rest.id ?? generatedId`). The trigger's `aria-describedby` names it.
   * @returns The id.
   */
  boxId(): string {
    return this.id ?? this.tooltipId
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return this.automationId ?? this.dataMolId ?? this.externalMolId
  }
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
  private readonly inner = signal<HTMLDivElement | null>(null)
  /** The element a caller's ref receives: the tooltip box, or `null` while hidden. */
  readonly element = this.inner.asReadonly()
  private readonly cdr = inject(ChangeDetectorRef)
  private showTimer: ReturnType<typeof setTimeout> | undefined
  private hideTimer: ReturnType<typeof setTimeout> | undefined
  private readonly hideListener = (): void => this.hide()
  private readonly layer = new OverlayLayer()
  private owner?: Document
  private lastVisible = false
  /** The rendered content the current position was measured for. */
  private lastContentText: string | null = null
  /** The placement the current position was measured for. */
  private lastPlacement: TooltipPlacement | null = null
  private associateEl: Element | null = null
  /** The `data-mol-id` a caller bound on the host (React spreads it onto the tooltip box). */
  private externalMolId: string | undefined

  /**
   * React re-measures in a layout effect whose dependencies include `content`
   * (`[isVisible, updatePosition, content]`), so asynchronously expanded
   * content stays anchored above its trigger. This port renders its content by
   * projection, which no component input can observe, so the rendered text is
   * compared after every render — the same moment React's layout effect runs.
   */
  constructor() {
    afterEveryRender(() => this.repositionForContentChange())
    // React's root is a fragment: the trigger wrapper renders in front of the host, the
    // children inside it. A lone element child is the one `aria-describedby` goes on.
    usePlacement((hasContent) => {
      const wrap = this.triggerWrap?.nativeElement
      const capture = this.childrenCapture?.nativeElement
      if (!wrap || !capture) return
      placeElementBefore(wrap, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
      // React spreads the rest props on the tooltip box, not on the trigger wrapper.
      setHostRoot(this.host.nativeElement, this.contentEl?.nativeElement, {
        except: ['data-mol-id'],
      })
      placeContent(capture, wrap)
      setElementPresent(capture, false)
      const children = hasContent.nodes(capture)
      // A `*molLazy` child is found once it is stamped (its stamp runs this again).
      // Any element, an SVG icon included (React's `isValidElement`).
      const only = children.length === 1 ? slotElement(children[0]) : null
      if (only === this.associateEl) return
      if (this.visible()) {
        this.associateEl?.removeAttribute('aria-describedby')
        only?.setAttribute('aria-describedby', this.boxId())
      }
      this.associateEl = only
    })
  }

  /**
   * Re-measures a visible tooltip whose rendered content or placement changed.
   */
  private repositionForContentChange(): void {
    const text = this.contentEl?.nativeElement.textContent ?? null
    if (text === this.lastContentText && this.placement === this.lastPlacement) return
    this.lastContentText = text
    this.lastPlacement = this.placement
    if (this.visible()) this.updatePosition()
  }

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
    const doc = this.triggerWrap?.nativeElement.ownerDocument
    if (doc) {
      this.releaseOwner()
      this.owner = doc
      const previous = activeTooltips.get(doc)
      if (previous !== this.hideListener) previous?.()
      activeTooltips.set(doc, this.hideListener)
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
    this.releaseOwner()
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
    if (!this.visible() && event.key === 'Escape') this.hide()
  }

  /**
   * Starts hidden (the trigger wrapper and its children are placed by the
   * placement function in the constructor).
   */
  ngAfterViewInit(): void {
    // React renders nothing while hidden.
    setElementPresent(this.portalWrap?.nativeElement, false)
    this.lastVisible = false
  }

  /**
   * Puts a `data-mol-id` bound on the host onto the tooltip in the pass that bound it (the host
   * attribute is written after this component's `ngDoCheck`).
   */
  ngAfterViewChecked(): void {
    adoptHostDataMolId(
      this.host.nativeElement,
      this.contentEl?.nativeElement,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
  }

  /**
   * Reconciles visibility (and its portal/focus side effects) each pass. A
   * content or placement change while visible is handled after the render
   * (`repositionForContentChange`), matching React's layout effect.
   */
  ngDoCheck(): void {
    adoptHostDataMolId(
      this.host.nativeElement,
      this.contentEl?.nativeElement,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
    const visible = this.visible()
    if (visible === this.lastVisible) return
    this.lastVisible = visible
    if (visible) this.attachPortal()
    else this.detachPortal()
  }

  /** Removes listeners/timers and drops the trigger association (unmount). */
  ngOnDestroy(): void {
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
    this.releaseOwner()
    this.layer.release()
    this.associateEl = null
  }

  /** Releases tooltip ownership even after the declaring view is detached. */
  private releaseOwner(): void {
    if (this.owner && activeTooltips.get(this.owner) === this.hideListener)
      activeTooltips.delete(this.owner)
    this.owner = undefined
  }

  /** Attaches the portal to `document.body`, positions it and associates it. */
  private attachPortal(): void {
    const portal = this.portalWrap?.nativeElement
    const trigger = this.triggerWrap?.nativeElement
    if (!portal || !trigger) return
    placeElement(portal, trigger.ownerDocument.body)
    const surface = this.contentEl?.nativeElement ?? null
    this.inner.set(surface)
    this.updatePosition()
    this.associateEl?.setAttribute('aria-describedby', this.boxId())
    this.layer.sync({
      open: true,
      kind: 'tooltip',
      surface: { current: surface },
      anchor: { current: trigger },
      dismissKey: true,
      onDismiss: this.hideListener,
    })
  }

  /** Detaches the portal and removes the trigger association. */
  private detachPortal(): void {
    const portal = this.portalWrap?.nativeElement
    placeElement(portal, null)
    setElementPresent(portal, false)
    this.inner.set(null)
    this.associateEl?.removeAttribute('aria-describedby')
    this.layer.release()
  }

  /** Measures the trigger and tooltip and updates the clamped position. */
  private updatePosition(): void {
    const trigger = this.triggerWrap?.nativeElement
    const tooltip = this.contentEl?.nativeElement
    if (!trigger || !tooltip) return
    this.position.set(measureTooltipPosition(trigger, tooltip, this.placement))
  }
}
