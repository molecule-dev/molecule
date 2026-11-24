/**
 * TimeSlotPicker component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  rendersNode,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { TimeSlot } from './types.js'

/**
 * TimeSlotPicker component.
 *
 * Picker for delivery / appointment / reservation time slots. Each slot shows
 * a label + optional secondary meta (date, fee, remaining capacity). Disabled
 * slots are dimmed and not clickable. The host IS the root `<div>`
 * (`div[mol-time-slot-picker]`), matching React's root exactly. Same props
 * (React names), same DOM, same `onSelect(slot)` calls as
 * `@molecule/app-time-slot-picker-react`'s `TimeSlotPicker`. A node-valued
 * `title` is projected (`[slot=title]`); a string input renders as text.
 * Node-valued `label`/`meta` on a slot arrive as templates and render through
 * `NgTemplateOutlet`. Selection is conveyed by `aria-checked` plus a bolder
 * label only; the component keeps no state, so the caller persists the pick
 * from `onSelect`.
 */
@Component({
  selector: 'div[mol-time-slot-picker]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['slots', 'selectedId', 'onSelect', 'layout', 'columns', 'title', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<h3 #titleEl [class]="titleClasses()">@if (hasTextTitle()) {<ng-container>{{ title }}</ng-container>}@if (titleTemplate()) {<ng-container [ngTemplateOutlet]="titleTemplate()"></ng-container>}<ng-content select="[slot=title]"></ng-content></h3><div role="radiogroup" [attr.aria-label]="ariaLabel()" [class]="groupClasses()">@for (slot of slots; track slot.id) {<button type="button" role="radio" [attr.aria-checked]="slot.id === selectedId ? 'true' : 'false'" [attr.disabled]="slot.disabled ? '' : null" (click)="pick(slot)" [class]="buttonClasses(slot)" [style.opacity]="slot.disabled ? 0.4 : null"><span>@if (isText(slot.label)) {<ng-container>{{ slot.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(slot.label)"></ng-container>}</span>@if (slot.meta) {<span [class]="cm().textSize('xs')">@if (isText(slot.meta)) {<ng-container>{{ slot.meta }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(slot.meta)"></ng-container>}</span>}</button>}</div>`,
})
export class TimeSlotPicker {
  /** The selectable slots, rendered in order. */
  slots: TimeSlot[] = []
  /** Currently selected slot id. */
  selectedId?: string
  /** Called when an enabled slot is picked. */
  onSelect?: (slot: TimeSlot) => void
  /** Layout — `'list'` stacks vertically, `'grid'` lays out in columns. */
  layout?: 'list' | 'grid'
  /** Grid column count (defaults to `2` at read time). */
  columns?: 2 | 3 | 4
  /** Optional title: text, or projected `[slot=title]` content. */
  title?: unknown
  /** Extra classes. */
  className?: string

  /** The title `<h3>` (its text input, template or projected slot decides its presence). */
  @ViewChild('titleEl', { static: true }) private titleEl?: ElementRef<HTMLHeadingElement>

  /** i18n state; its `t` reads the provider on every call. */
  private readonly i18n = useTranslation()

  /**
   * Keeps the title `<h3>` on the page only while it renders a text input, a
   * title template or projected `[slot=title]` content, re-decided whenever
   * they change (a slot taken away and given back included). React renders no
   * heading when its `title` is falsy.
   */
  constructor() {
    usePlacement((hasContent) => {
      const el = this.titleEl?.nativeElement
      setElementPresent(
        el,
        this.hasTextTitle() || this.titleTemplate() !== null || (el ? hasContent(el) : false),
      )
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * Computes the title's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the slot container's class list: React's fixed-column grid or the
   * list stack.
   * @returns The class string.
   */
  groupClasses(): string {
    return this.layout === 'grid'
      ? this.cm().grid({ cols: this.columns ?? 2, gap: 'sm' })
      : this.cm().stack(2)
  }

  /**
   * Computes one slot button's class list (React's selected / unselected
   * weight switch).
   * @param slot - The slot.
   * @returns The class string.
   */
  buttonClasses(slot: TimeSlot): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col', align: 'start' }),
      this.cm().sp('p', 3),
      this.cm().textSize('sm'),
      slot.id === this.selectedId
        ? this.cm().fontWeight('semibold')
        : this.cm().fontWeight('medium'),
    )
  }

  /**
   * React's radiogroup aria-label: the title text when it is a plain string that renders
   * (`slot(title)`: an empty title, like a node title, falls back to the translated label).
   * @returns The accessible name.
   */
  ariaLabel(): string {
    return typeof this.title === 'string' && rendersNode(this.title)
      ? this.title
      : this.i18n.t('timeSlot.aria', {}, { defaultValue: 'Time slots' })
  }

  /**
   * React's guarded click: a disabled slot never calls `onSelect`.
   * @param slot - The clicked slot.
   */
  pick(slot: TimeSlot): void {
    if (!slot.disabled) this.onSelect?.(slot)
  }

  /**
   * Whether the title is a non-empty text input.
   * @returns True when the title input renders as text.
   */
  hasTextTitle(): boolean {
    return typeof this.title === 'string' && this.title !== ''
  }

  /**
   * The title's template, when the title arrives as a node value.
   * @returns The template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return this.templateOf(this.title)
  }

  /**
   * Whether a value is plain text (React renders it as text, not as nodes).
   * @param value - A label or meta line.
   * @returns True when the value is a string.
   */
  isText(value: unknown): value is string {
    return typeof value === 'string'
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A label, meta line or title.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }
}
