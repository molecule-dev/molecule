/**
 * ListItemRow component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'

/**
 * ListItemRow component.
 *
 * Generic "thumbnail + text + actions" row — used everywhere: navigation
 * lists, mobile menus, inbox-style threads, search results, picker dialogs,
 * bookmark lists, etc. The host IS the root `<div>` (`div[mol-list-item-row]`),
 * matching React's root exactly; the disabled row's dimmed opacity is applied
 * inline through a host style binding (the CSSOM, as react-dom does).
 *
 * The node props are projected slots: `title` renders inside the title line,
 * `subtitle` inside its line, `metadata` inside its line, `leading` inside the
 * leading `<div>` and `actions` inside the right-side `<div>` (whose click is
 * stopPropagation'd, so action buttons never trigger the row `onClick`).
 * String inputs render as text instead — React's truthiness branch applies:
 * an empty string renders nothing. The conditionally-rendered wrappers
 * reconcile against that in {@link ListItemRow.ngAfterViewInit}.
 */
@Component({
  selector: 'div[mol-list-item-row]',
  standalone: true,
  inputs: [
    'title',
    'subtitle',
    'metadata',
    'leading',
    'actions',
    'onClick',
    'selected',
    'disabled',
    'density',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.role]': "this.onClick ? 'button' : null",
    '[attr.tabindex]': 'this.clickable() ? 0 : null',
    '[attr.aria-selected]': 'this.selected ?? null',
    '[attr.aria-disabled]': 'this.disabled ?? null',
    '[style.opacity]': 'this.disabled ? 0.5 : null',
    '(click)': 'handleClick($event)',
  },
  template: `<div #leadingWrap [class]="leadingClass()">
      @if (leadingText()) {
        {{ leadingText() }}
      }
      <ng-content select="[slot=leading]"></ng-content>
    </div>
    <div [class]="stackClass()">
      <div [class]="titleClass()">
        @if (titleText()) {
          {{ titleText() }}
        }
        <ng-content select="[slot=title]"></ng-content>
      </div>
      <div #subtitleWrap [class]="subtitleClass()">
        @if (subtitleText()) {
          {{ subtitleText() }}
        }
        <ng-content select="[slot=subtitle]"></ng-content>
      </div>
      <div #metadataWrap [class]="metadataClass()">
        @if (metadataText()) {
          {{ metadataText() }}
        }
        <ng-content select="[slot=metadata]"></ng-content>
      </div>
    </div>
    <div #actionsWrap [class]="actionsClass()" (click)="stopPropagation($event)">
      <ng-content select="[slot=actions]"></ng-content>
    </div>`,
})
export class ListItemRow implements AfterViewInit, AfterViewChecked {
  /** Title — first line (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Optional second line (string/number as text; nodes are `[slot=subtitle]` content). */
  subtitle?: unknown
  /** Optional third line (string/number as text; nodes are `[slot=metadata]` content). */
  metadata?: unknown
  /** Optional leading slot — icon, avatar, thumbnail (`[slot=leading]` content, or text). */
  leading?: unknown
  /** Optional right-side actions (`[slot=actions]` content, or text). */
  actions?: unknown
  /** Called when the row body is clicked; receives the DOM click event (React's `onClick`). */
  onClick?: (event: Event) => void
  /** When true, sets `aria-selected` on the row — no built-in visual highlight. */
  selected?: boolean
  /** When true, renders in a disabled visual state and drops `onClick`. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'` at read time. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string

  /** The leading wrapper (detached when no leading value and the slot is empty). */
  @ViewChild('leadingWrap') leadingWrap?: ElementRef<HTMLElement>
  /** The subtitle line (detached when no subtitle value and the slot is empty). */
  @ViewChild('subtitleWrap') subtitleWrap?: ElementRef<HTMLElement>
  /** The metadata line (detached when no metadata value and the slot is empty). */
  @ViewChild('metadataWrap') metadataWrap?: ElementRef<HTMLElement>
  /** The actions wrapper (detached when no actions value and the slot is empty). */
  @ViewChild('actionsWrap') actionsWrap?: ElementRef<HTMLElement>

  /** Whether the projected slots' presence has been read (read once: projection never changes). */
  private slotsRead = false
  /** Whether the leading slot holds content (read once with the slots). */
  private hasLeadingSlot = false
  /** Whether the subtitle slot holds content (read once with the slots). */
  private hasSubtitleSlot = false
  /** Whether the metadata slot holds content (read once with the slots). */
  private hasMetadataSlot = false
  /** Whether the actions slot holds content (read once with the slots). */
  private hasActionsSlot = false

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list (`cm.flex({ align: 'center', gap: 'sm' })` +
   * `cm.sp('px', 3)` + `cm.sp('py', padY)` + `cm.cursorPointer` only when
   * clickable + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', this.padY()),
      this.clickable() ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * Computes the middle stack's class (`cm.flex1` + `cm.stack(0)`).
   * @returns The class string.
   */
  stackClass(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0))
  }

  /**
   * The leading wrapper's class (`cm.shrink0`).
   * @returns The class string.
   */
  leadingClass(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The subtitle line's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  subtitleClass(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The metadata line's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  metadataClass(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * The actions wrapper's class (`cm.shrink0`).
   * @returns The class string.
   */
  actionsClass(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * Computes the title line's class (`cm.textSize('sm')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClass(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * Whether the row is clickable: an `onClick` and not `disabled` (React's
   * `onClick && !disabled`).
   * @returns True when the row is clickable.
   */
  clickable(): boolean {
    return Boolean(this.onClick) && !this.disabled
  }

  /**
   * The vertical padding token argument (`2` for `'compact'`, else `3` —
   * React's default parameter).
   * @returns The padding step.
   */
  padY(): 2 | 3 {
    return this.density === 'compact' ? 2 : 3
  }

  /**
   * The title input's text (React's `{title}` for a text child: strings and
   * numbers render; a node arrives as `[slot=title]` content instead).
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? String(this.title)
      : ''
  }

  /**
   * The subtitle input's text (React's `{subtitle}` for a text child).
   * @returns The text, or `''` for a node value.
   */
  subtitleText(): string {
    return typeof this.subtitle === 'string' || typeof this.subtitle === 'number'
      ? String(this.subtitle)
      : ''
  }

  /**
   * The metadata input's text (React's `{metadata}` for a text child).
   * @returns The text, or `''` for a node value.
   */
  metadataText(): string {
    return typeof this.metadata === 'string' || typeof this.metadata === 'number'
      ? String(this.metadata)
      : ''
  }

  /**
   * The leading input's text (React's `{leading}` for a text child).
   * @returns The text, or `''` for a node value.
   */
  leadingText(): string {
    return typeof this.leading === 'string' || typeof this.leading === 'number'
      ? String(this.leading)
      : ''
  }

  /**
   * The actions input's text (React's `{actions}` for a text child).
   * @returns The text, or `''` for a node value.
   */
  actionsText(): string {
    return typeof this.actions === 'string' || typeof this.actions === 'number'
      ? String(this.actions)
      : ''
  }

  /** Runs the click handler the way React forwards the DOM event, unless disabled. */
  handleClick(event: Event): void {
    if (this.disabled) return
    this.onClick?.(event)
  }

  /**
   * Keeps clicks inside the actions from reaching the row (React's
   * stopPropagation on the actions `<div>`).
   */
  stopPropagation(event: Event): void {
    event.stopPropagation()
  }

  /** Reads slot presence (view queries resolve only at view init) and reconciles the wrappers. */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after every view refresh (a props step may add or remove a
   * value): the wrappers are toggled on the values the template just rendered,
   * so a later props step lands in one pass.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Applies React's conditions: the leading, subtitle, metadata and actions
   * wrappers render only when their input holds text or their slot holds
   * projected content. The slots' presence is read once — the projected
   * content never changes for this component's lifetime.
   */
  private reconcile(): void {
    const leading = this.leadingWrap?.nativeElement
    const subtitle = this.subtitleWrap?.nativeElement
    const metadata = this.metadataWrap?.nativeElement
    const actions = this.actionsWrap?.nativeElement
    if (!this.slotsRead && leading && subtitle && metadata && actions) {
      this.hasLeadingSlot = hasNodes(leading)
      this.hasSubtitleSlot = hasNodes(subtitle)
      this.hasMetadataSlot = hasNodes(metadata)
      this.hasActionsSlot = hasNodes(actions)
      this.slotsRead = true
    }

    this.guard.toggle(leading, this.leadingText() !== '' || this.hasLeadingSlot)
    this.guard.toggle(subtitle, this.subtitleText() !== '' || this.hasSubtitleSlot)
    this.guard.toggle(metadata, this.metadataText() !== '' || this.hasMetadataSlot)
    this.guard.toggle(actions, this.actionsText() !== '' || this.hasActionsSlot)
  }
}
