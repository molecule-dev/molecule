/**
 * TimeSlotPicker component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { TimeSlot } from './types.js'

/**
 * Whether a wrapper element renders anything besides its static content: an
 * element child (a projected `[slot=title]` landed) or non-empty text.
 *
 * @param node - The wrapper element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (node: Node): boolean =>
  Array.from(node.childNodes).some(
    (child) =>
      child.nodeType === Node.ELEMENT_NODE ||
      (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim().length > 0),
  )

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
  imports: [NgTemplateOutlet],
  inputs: ['slots', 'selectedId', 'onSelect', 'layout', 'columns', 'title', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (showTitle()) {<h3 #titleEl [class]="titleClasses()">@if (hasTextTitle()) {<ng-container>{{ title }}</ng-container>}@if (titleTemplate()) {<ng-container [ngTemplateOutlet]="titleTemplate()"></ng-container>}<ng-content select="[slot=title]"></ng-content></h3>}<div role="radiogroup" [attr.aria-label]="ariaLabel()" [class]="groupClasses()">@for (slot of slots; track slot.id) {<button type="button" role="radio" [attr.aria-checked]="slot.id === selectedId ? 'true' : 'false'" [attr.disabled]="slot.disabled ? '' : null" (click)="pick(slot)" [class]="buttonClasses(slot)" [style.opacity]="slot.disabled ? 0.4 : null"><span>@if (isText(slot.label)) {<ng-container>{{ slot.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(slot.label)"></ng-container>}</span>@if (slot.meta) {<span [class]="cm().textSize('xs')">@if (isText(slot.meta)) {<ng-container>{{ slot.meta }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(slot.meta)"></ng-container>}</span>}</button>}</div>`,
})
export class TimeSlotPicker implements AfterViewInit {
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

  /** The rendered `<h3>` (its content decides whether a title exists at all). */
  @ViewChild('titleEl') private titleEl?: ElementRef<HTMLHeadingElement>

  /** Whether a `[slot=title]` projection landed (true until the first view proves otherwise). */
  private readonly titleProjected = signal(true)

  /** i18n state; its `t` reads the provider on every call. */
  private readonly i18n = useTranslation()

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
   * React's radiogroup aria-label: the title text when it is a plain string
   * (a node title falls back to the translated label).
   * @returns The accessible name.
   */
  ariaLabel(): string {
    return typeof this.title === 'string'
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
   * Whether the `<h3>` renders: React's `title &&` on the text input, a title
   * template, or projected `[slot=title]` content (withdrawn at view init when
   * none of the three is present).
   * @returns True when the title shows.
   */
  showTitle(): boolean {
    return this.hasTextTitle() || this.titleTemplate() !== null || this.titleProjected()
  }

  /**
   * Reads the rendered `<h3>` once: when neither a title input nor projected
   * content landed, React would not render the element at all, so the
   * optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const el = this.titleEl?.nativeElement
    if (el && !this.hasTextTitle() && this.titleTemplate() === null && !hasRenderableContent(el)) {
      this.titleProjected.set(false)
    }
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
