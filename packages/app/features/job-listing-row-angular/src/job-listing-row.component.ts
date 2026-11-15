/**
 * JobListingRow component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasProjectedSlot, SlotGuard } from './slot-dom.js'

/**
 * JobListingRow component.
 *
 * Job-board row — title + company + location + type + salary + posted date
 * with optional leading logo, tag chips, and right-side actions. The host IS
 * the root `<div>` (`div[mol-job-listing-row]`), matching React's root
 * exactly.
 *
 * The location value is prefixed with the same hardcoded 📍 glyph React
 * renders, and the meta fields carry the same literal middle-dot separators
 * (there is no prop to change or localise them).
 *
 * `onClick` makes the whole row clickable but renders no button semantics —
 * supply your own focus/keyboard affordance (or wrap the row in a
 * button/link) when click-to-open matters for a11y.
 *
 * The node props are projected slots: `leading`, `company`, `location`,
 * `type`, `salary`, `postedAt`, `tags` and `actions` each render inside the
 * wrapper element React renders for them (React renders every node prop of
 * this row inside its own element). String inputs render as text instead —
 * React's truthiness branch applies: an empty string renders nothing. The
 * capture wrappers reconcile against that in {@link JobListingRow.ngAfterViewInit}.
 */
@Component({
  selector: 'div[mol-job-listing-row]',
  standalone: true,
  inputs: [
    'title',
    'company',
    'location',
    'type',
    'salary',
    'postedAt',
    'leading',
    'actions',
    'tags',
    'onClick',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '(click)': 'handleClick($event)',
  },
  template: `<div #leadingWrap [class]="leadingClasses()">
      {{ leadingText() }}
      <ng-content select="[slot=leading]"></ng-content>
    </div>
    <div [class]="stackClasses()">
      <h3 [class]="titleClasses()">
        {{ titleText() }}
        <ng-content select="[slot=title]"></ng-content>
      </h3>
      <span #companyWrap [class]="companyClasses()">
        {{ companyText() }}
        <ng-content select="[slot=company]"></ng-content>
      </span>
      <div [class]="metaClasses()">
        <span #locationWrap [class]="locationClasses()">
          {{ '📍 ' + locationText() }}
          <ng-content select="[slot=location]"></ng-content>
        </span>
        <span #typeWrap [class]="typeClasses()">
          {{ '· ' + typeText() }}
          <ng-content select="[slot=type]"></ng-content>
        </span>
        <span #salaryWrap [class]="salaryClasses()">
          {{ '· ' + salaryText() }}
          <ng-content select="[slot=salary]"></ng-content>
        </span>
        <span #postedAtWrap [class]="postedAtClasses()">
          {{ '· ' + postedAtText() }}
          <ng-content select="[slot=postedAt]"></ng-content>
        </span>
      </div>
      <div #tagsWrap [class]="tagsClasses()">
        {{ tagsText() }}
        <ng-content select="[slot=tags]"></ng-content>
      </div>
    </div>
    <div #actionsWrap [class]="actionsClasses()">
      {{ actionsText() }}
      <ng-content select="[slot=actions]"></ng-content>
    </div>`,
})
export class JobListingRow implements AfterViewInit, DoCheck {
  /** Title of the role (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Company / employer display (string/number as text; nodes are `[slot=company]` content). */
  company?: unknown
  /** Location display (string/number as text; nodes are `[slot=location]` content). */
  location?: unknown
  /** Employment type (string/number as text; nodes are `[slot=type]` content). */
  type?: unknown
  /** Salary range display (string/number as text; nodes are `[slot=salary]` content). */
  salary?: unknown
  /** Posted-at display (string/number as text; nodes are `[slot=postedAt]` content). */
  postedAt?: unknown
  /** Optional company logo / icon (string as text; nodes are `[slot=leading]` content). */
  leading?: unknown
  /** Optional right-side actions (string as text; nodes are `[slot=actions]` content). */
  actions?: unknown
  /** Tags / chips (string as text; nodes are `[slot=tags]` content). */
  tags?: unknown
  /** Click handler; receives the DOM click event (React's `onClick`). */
  onClick?: (event: Event) => void
  /** Extra classes. */
  className?: string

  /** The leading wrapper `<div>` (detached when no leading input and the slot is empty). */
  @ViewChild('leadingWrap') leadingWrap?: ElementRef<HTMLElement>
  /** The company `<span>` (detached when no company input and the slot is empty). */
  @ViewChild('companyWrap') companyWrap?: ElementRef<HTMLElement>
  /** The location `<span>` (detached when no location input and the slot is empty). */
  @ViewChild('locationWrap') locationWrap?: ElementRef<HTMLElement>
  /** The type `<span>` (detached when no type input and the slot is empty). */
  @ViewChild('typeWrap') typeWrap?: ElementRef<HTMLElement>
  /** The salary `<span>` (detached when no salary input and the slot is empty). */
  @ViewChild('salaryWrap') salaryWrap?: ElementRef<HTMLElement>
  /** The posted-at `<span>` (detached when no postedAt input and the slot is empty). */
  @ViewChild('postedAtWrap') postedAtWrap?: ElementRef<HTMLElement>
  /** The tags wrapper `<div>` (detached when no tags input and the slot is empty). */
  @ViewChild('tagsWrap') tagsWrap?: ElementRef<HTMLElement>
  /** The actions wrapper `<div>` (detached when no actions input and the slot is empty). */
  @ViewChild('actionsWrap') actionsWrap?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list (`cm.flex({ align: 'start', gap: 'md' })` +
   * `cm.sp('p', 3)` + `cm.cursorPointer` only with an `onClick` +
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'start', gap: 'md' }),
      this.cm().sp('p', 3),
      this.onClick ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * Computes the stack's class (`cm.flex1` + `cm.stack(1)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * Computes the title's class (`cm.textSize('base')` +
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the meta row's class
   * (`cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * Computes the leading wrapper's class (`cm.shrink0`).
   * @returns The class string.
   */
  leadingClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * Computes the company span's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  companyClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * Computes the location span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  locationClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Computes the type span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  typeClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Computes the posted-at span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  postedAtClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Computes the salary span's class (`cm.textSize('xs')` +
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  salaryClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the tags row's class
   * (`cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })`).
   * @returns The class string.
   */
  tagsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' })
  }

  /**
   * Computes the actions row's class
   * (`cm.flex({ align: 'center', gap: 'sm' })` + `cm.shrink0`).
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().shrink0)
  }

  /**
   * The input's text (React's `{expr}` for a text child: strings and numbers
   * render; a node arrives as `[slot=<name>]` content instead).
   * @param value - The input value.
   * @returns The text, or `''` for a node value.
   */
  private textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * The title input's text.
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return this.textOf(this.title)
  }

  /**
   * The company input's text.
   * @returns The text, or `''` for a node value.
   */
  companyText(): string {
    return this.textOf(this.company)
  }

  /**
   * The location input's text.
   * @returns The text, or `''` for a node value.
   */
  locationText(): string {
    return this.textOf(this.location)
  }

  /**
   * The type input's text.
   * @returns The text, or `''` for a node value.
   */
  typeText(): string {
    return this.textOf(this.type)
  }

  /**
   * The salary input's text.
   * @returns The text, or `''` for a node value.
   */
  salaryText(): string {
    return this.textOf(this.salary)
  }

  /**
   * The postedAt input's text.
   * @returns The text, or `''` for a node value.
   */
  postedAtText(): string {
    return this.textOf(this.postedAt)
  }

  /**
   * The leading input's text.
   * @returns The text, or `''` for a node value.
   */
  leadingText(): string {
    return this.textOf(this.leading)
  }

  /**
   * The actions input's text.
   * @returns The text, or `''` for a node value.
   */
  actionsText(): string {
    return this.textOf(this.actions)
  }

  /**
   * The tags input's text.
   * @returns The text, or `''` for a node value.
   */
  tagsText(): string {
    return this.textOf(this.tags)
  }

  /** Runs the click handler the way React forwards the DOM event. */
  handleClick(event: Event): void {
    this.onClick?.(event)
  }

  /**
   * Reconciles the wrappers once the view queries resolve.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes (a props step may add a company or a
   * salary, or empty the leading value, which React re-renders).
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Applies React's conditions: each node prop's wrapper renders when the
   * string input is non-empty or the slot holds projected content (the title
   * `<h3>`, the stack `<div>` and the meta row `<div>` are always rendered,
   * exactly as React renders them). Re-read every pass, so a props step that
   * empties a previously set input drops the wrapper.
   */
  private reconcile(): void {
    const leading = this.leadingWrap?.nativeElement
    const company = this.companyWrap?.nativeElement
    const location = this.locationWrap?.nativeElement
    const type = this.typeWrap?.nativeElement
    const salary = this.salaryWrap?.nativeElement
    const postedAt = this.postedAtWrap?.nativeElement
    const tags = this.tagsWrap?.nativeElement
    const actions = this.actionsWrap?.nativeElement
    this.guard.toggle(leading, this.leadingText() !== '' || hasProjectedSlot(leading))
    this.guard.toggle(company, this.companyText() !== '' || hasProjectedSlot(company))
    this.guard.toggle(location, this.locationText() !== '' || hasProjectedSlot(location))
    this.guard.toggle(type, this.typeText() !== '' || hasProjectedSlot(type))
    this.guard.toggle(salary, this.salaryText() !== '' || hasProjectedSlot(salary))
    this.guard.toggle(postedAt, this.postedAtText() !== '' || hasProjectedSlot(postedAt))
    this.guard.toggle(tags, this.tagsText() !== '' || hasProjectedSlot(tags))
    this.guard.toggle(actions, this.actionsText() !== '' || hasProjectedSlot(actions))
  }
}
