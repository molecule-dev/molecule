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
 * The row's open action lives on a native open button — an empty, transparent
 * `<button type="button">` stretched over the whole row
 * (`data-mol-id="list-item-row-open"`, `aria-labelledby` the title), the way
 * React renders it while the row has an `onClick`; Enter / Space on it run the
 * same handler mouse clicks run. An `@if` in the template puts it in the DOM
 * only while the row has an `onClick` (React renders no button at all
 * otherwise), and the actions wrapper sits above it and keeps its own clicks.
 * The projected body renders directly in the host, so the wrappers never move.
 *
 * The node props are projected slots: `title` renders inside the title line,
 * `subtitle` inside its line, `metadata` inside its line, `leading` inside the
 * leading `<div>` and `actions` inside the right-side `<div>`. String inputs
 * render as text instead — React's truthiness branch applies: an empty string
 * renders nothing. The conditionally-rendered wrappers reconcile against that
 * in {@link ListItemRow.ngAfterViewInit}.
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
    '[attr.aria-current]': 'this.selected ? "true" : null',
    '[attr.aria-disabled]': 'this.disabled ?? null',
    '[style.opacity]': 'this.disabled ? 0.5 : null',
  },
  template: `@if (onClick) {
      <button
        type="button"
        [attr.aria-labelledby]="nameId"
        [attr.disabled]="disabled ? '' : null"
        data-mol-id="list-item-row-open"
        (click)="handleClick()"
        [class]="openButtonClasses()"
        style="background: transparent; border: medium; padding: 0px"
      ></button>
    }
    <div #leadingWrap [class]="leadingClass()">
      @if (leadingText()) {
        {{ leadingText() }}
      }
      <ng-content select="[slot=leading]"></ng-content>
    </div>
    <div [class]="stackClass()">
      <div [attr.id]="onClick ? nameId : null" [class]="titleClass()">
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
    <div #actionsWrap [class]="actionsClass()">
      @if (actionsText()) {
        {{ actionsText() }}
      }
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
  /**
   * Called when the row is activated (React's `onClick`, called bare). The
   * whole row is clickable through a transparent native button over it, named
   * by the title; the inner controls sit above it and keep their own clicks.
   */
  onClick?: () => void
  /** When true, sets `aria-current="true"` on the row — no built-in visual highlight. */
  selected?: boolean
  /** When true, renders in a disabled visual state and disables the open button. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'` at read time. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string

  /** Next value of the module-wide instance counter (React `useId()`'s counterpart). */
  private static nextNameId = 0

  /** The title line's id — the open button's `aria-labelledby` (React's `useId`). */
  readonly nameId = `list-item-row-title-${ListItemRow.nextNameId++}`

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
   * `cm.sp('px', 3)` + `cm.sp('py', padY)` + `className` — plus
   * `cm.position('relative')` while the row has an `onClick`, so the absolute
   * open button anchors to the row like React's).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', this.padY()),
      this.hasOpenAction() ? this.cm().position('relative') : undefined,
      this.className,
    )
  }

  /**
   * Computes the open button's class (`cm.position('absolute')` + `cm.inset0`,
   * plus `cm.cursorPointer` unless the row is disabled — the whole row is the
   * hit area).
   * @returns The class string.
   */
  openButtonClasses(): string {
    return this.cm().cn(
      this.cm().position('absolute'),
      this.cm().inset0,
      this.disabled ? undefined : this.cm().cursorPointer,
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
   * The actions wrapper's class (`cm.shrink0` + `cm.position('relative')` —
   * the actions sit above the open button and keep their own clicks).
   * @returns The class string.
   */
  actionsClass(): string {
    return this.cm().cn(this.cm().shrink0, this.cm().position('relative'))
  }

  /**
   * Computes the title line's class (`cm.textSize('sm')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClass(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * Whether the row has an open action: an `onClick` (React renders the open
   * button and the root's `position: relative` while it does — `disabled`
   * only disables the button, it does not remove it).
   * @returns True when the row renders the open button.
   */
  hasOpenAction(): boolean {
    return Boolean(this.onClick)
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

  /**
   * Runs the row's open action, the way React forwards the open button's
   * click (bare, no event). A disabled row never calls it: the button carries
   * `disabled`, so browsers raise no click from it, and the guard holds for a
   * synthetic one.
   */
  handleClick(): void {
    if (this.disabled) return
    this.onClick?.()
  }

  /** Reads slot presence (view queries resolve only at view init) and reconciles the wrappers. */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after every view refresh (a props step may add or remove a
   * value): the wrappers are toggled on the values the template just
   * rendered, so a later props step lands in one pass.
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
