/**
 * JobListingRow component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * `onClick` covers the whole row with an empty, transparent native button
 * that activates it — the whole row is the click target, named by the title
 * (the `<h3>` itself takes the id the button points at with
 * `aria-labelledby`), with the inner controls above it keeping their own
 * clicks.
 *
 * The node props are projected slots: `leading`, `company`, `location`,
 * `type`, `salary`, `postedAt`, `tags` and `actions` each render inside the
 * wrapper element React renders for them (React renders every node prop of
 * this row inside its own element). String inputs render as text instead —
 * React's truthiness branch applies: an empty string renders nothing. The
 * capture wrappers reconcile against that in the placement function registered
 * in the constructor (each wrapper renders its own text first, so the slot is
 * read past that one leading node).
 */
@Component({
  selector: 'div[mol-job-listing-row]',
  standalone: true,
  hostDirectives: [MolPlacement],
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
  },
  template: `@if (hasOnClick()) {
      <!-- mol-bespoke-button: the whole row is the hit area, not a CTA — an
         empty, transparent button over the row; the inline background/border/
         padding are native resets. The style values carry the form React's
         attribute shows after CSSOM (Angular writes the attribute raw): the
         border is its initial "none" style at "medium" width, padding the
         pixel form of 0 — visually identical, textually equal to React. -->
      <button
        type="button"
        [attr.aria-labelledby]="nameId"
        data-mol-id="job-listing-row-open"
        (click)="handleClick()"
        [class]="openClasses()"
        style="background: transparent; border: medium; padding: 0px;"
      ></button>
    }
    <div #leadingWrap [class]="leadingClasses()">
      {{ leadingText() }}
      <ng-content select="[slot=leading]"></ng-content>
    </div>
    <div [class]="stackClasses()">
      <h3 [attr.id]="nameId" [class]="titleClasses()">
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
export class JobListingRow {
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
  /**
   * Activates the row: while it is set, an empty, transparent native button
   * covers the whole row and calls this on click — the whole row is the click
   * target, and Enter / Space activate the button natively. The row is named
   * by the title (the `<h3>` itself takes the id the button points at with
   * `aria-labelledby`); the `actions` and `tags` slots sit above the button
   * and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string

  /** Source of the per-instance title ids (the `aria-labelledby` targets). */
  private static nextNameId = 0

  /** The title `<h3>`'s id — the open button's `aria-labelledby` target. */
  protected readonly nameId = `mol-job-listing-row-title-${JobListingRow.nextNameId++}`

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

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list (`cm.flex({ align: 'start', gap: 'md' })` +
   * `cm.sp('p', 3)` + the click overlay's positioning context + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'start', gap: 'md' }),
      this.cm().sp('p', 3),
      this.hasOnClick() ? this.cm().position('relative') : undefined,
      this.className,
    )
  }

  /**
   * Whether React renders the row's open control: an `onClick` is set.
   * @returns True when the row is clickable.
   */
  hasOnClick(): boolean {
    return Boolean(this.onClick)
  }

  /**
   * Computes the open button's class
   * (`cm.position('absolute')` + `cm.inset0` + `cm.cursorPointer`).
   * @returns The class string.
   */
  openClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
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
   * (`cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })` +
   * `cm.position('relative')`, raised above the open button).
   * @returns The class string.
   */
  tagsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
      this.cm().position('relative'),
    )
  }

  /**
   * Computes the actions row's class
   * (`cm.flex({ align: 'center', gap: 'sm' })` + `cm.shrink0` +
   * `cm.position('relative')`, raised above the open button).
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().shrink0,
      this.cm().position('relative'),
    )
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

  /** Runs the click handler (the open button forwards no event, like React's `() => onClick()`). */
  handleClick(): void {
    this.onClick?.()
  }

  /**
   * Applies React's conditions: each node prop's wrapper renders when the
   * string input is non-empty or the slot holds projected content (the title
   * `<h3>`, the stack `<div>` and the meta row `<div>` are always rendered,
   * exactly as React renders them; the open button is Angular's own `@if` on
   * {@link hasOnClick}). Re-read every run, so a props step that empties a
   * previously set input drops the wrapper.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const leading = this.leadingWrap?.nativeElement
    const company = this.companyWrap?.nativeElement
    const location = this.locationWrap?.nativeElement
    const type = this.typeWrap?.nativeElement
    const salary = this.salaryWrap?.nativeElement
    const postedAt = this.postedAtWrap?.nativeElement
    const tags = this.tagsWrap?.nativeElement
    const actions = this.actionsWrap?.nativeElement
    setElementPresent(leading, this.leadingText() !== '' || hasContent(leading, 1))
    setElementPresent(company, this.companyText() !== '' || hasContent(company, 1))
    setElementPresent(location, this.locationText() !== '' || hasContent(location, 1))
    setElementPresent(type, this.typeText() !== '' || hasContent(type, 1))
    setElementPresent(salary, this.salaryText() !== '' || hasContent(salary, 1))
    setElementPresent(postedAt, this.postedAtText() !== '' || hasContent(postedAt, 1))
    setElementPresent(tags, this.tagsText() !== '' || hasContent(tags, 1))
    setElementPresent(actions, this.actionsText() !== '' || hasContent(actions, 1))
  }
}
