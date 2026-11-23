/**
 * Checklist component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Checkbox } from '@molecule/app-ui-angular'

import type { ChecklistItem } from './types.js'

/**
 * Checklist component.
 *
 * Onboarding-style checklist with checkboxes, optional descriptions and an
 * overall progress bar derived from `items`. The host IS the root `<div>`
 * (`div[mol-checklist]`), matching React's root exactly. Same props (React
 * names), same DOM, same `onToggle(id, next)` calls as
 * `@molecule/app-checklist-react`'s `Checklist`. A node-valued `title` is
 * projected (`[slot=title]`); a string input renders as text. Node-valued
 * `label`/`description` on an item arrive as templates and render through
 * `NgTemplateOutlet`. The component is fully controlled: it never mutates
 * `completed`; persist the toggle in `onToggle(id, next)` and pass updated
 * `items` again.
 */
@Component({
  selector: 'div[mol-checklist]',
  standalone: true,
  imports: [Checkbox, NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: ['items', 'onToggle', 'showProgress', 'title', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<h3 #titleEl [class]="titleClasses()">@if (hasTextTitle()) {<ng-container>{{ title }}</ng-container>}@if (titleTemplate()) {<ng-container [ngTemplateOutlet]="titleTemplate()"></ng-container>}<ng-content select="[slot=title]"></ng-content></h3>@if (showProgressEnabled()) {<div [class]="cm().stack(1)"><div [class]="cm().flex({ justify: 'between', align: 'center' })"><span [class]="cm().textSize('xs')">{{ progressText() }}</span><span [class]="cm().cn(cm().textSize('xs'), cm().fontWeight('semibold'))">{{ pct() }}%</span></div><div [class]="cm().cn(cm().progress(), cm().progressHeight('sm'))"><div [class]="cm().cn(cm().progressBar(), cm().progressColor('primary'))" [style.width]="pct() + '%'"></div></div></div>}<ul [class]="cm().stack(2)">@for (item of items; track item.id) {<li [class]="cm().flex({ align: 'start', gap: 'sm' })"><span [class]="cm().shrink0"><div mol-checkbox [checked]="item.completed" [disabled]="item.disabled" [attr.aria-label]="ariaLabel(item)" (change)="toggle(item, $event)"></div></span><div [class]="cm().cn(cm().flex1, cm().stack(0))"><span [class]="labelClasses(item)" [style.text-decoration]="item.completed ? 'line-through' : null" [style.opacity]="item.completed ? 0.6 : null">@if (isText(item.label)) {<ng-container>{{ item.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.label)"></ng-container>}</span>@if (item.description) {<span [class]="cm().textSize('xs')">@if (isText(item.description)) {<ng-container>{{ item.description }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.description)"></ng-container>}</span>}</div></li>}</ul>`,
})
export class Checklist {
  /** The checklist items, rendered in order. */
  items: ChecklistItem[] = []
  /** Called when an item is toggled, with its id and the checkbox's new state. */
  onToggle?: (id: string, next: boolean) => void
  /** Show the progress block (defaults to true at read time). */
  showProgress?: boolean
  /** Optional title: text, or projected `[slot=title]` content. */
  title?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The `<h3>` (always in the template; detached while it has nothing to render). */
  @ViewChild('titleEl', { static: true }) private titleEl?: ElementRef<HTMLHeadingElement>

  /** i18n state; its `t` reads the provider on every call. */
  private readonly i18n = useTranslation()

  /**
   * Keeps the `<h3>` on the page only while it renders a title input, a title
   * template or projected `[slot=title]` content, re-decided whenever any of
   * them changes (a title taken away and given back included).
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
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * Computes the title's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes one item label's class list (React's weight switch).
   * @param item - The checklist item.
   * @returns The class string.
   */
  labelClasses(item: ChecklistItem): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      item.completed ? this.cm().fontWeight('medium') : this.cm().fontWeight('semibold'),
    )
  }

  /**
   * The number of items.
   * @returns The item count.
   */
  total(): number {
    return this.items.length
  }

  /**
   * The number of completed items.
   * @returns The completed count.
   */
  done(): number {
    return this.items.filter((item) => item.completed).length
  }

  /**
   * The completion percentage (0 for an empty list).
   * @returns The rounded percentage.
   */
  pct(): number {
    return this.total() === 0 ? 0 : Math.round((this.done() / this.total()) * 100)
  }

  /**
   * The translated progress summary.
   * @returns The progress text.
   */
  progressText(): string {
    return this.i18n.t(
      'checklist.progress',
      { done: this.done(), total: this.total() },
      { defaultValue: '{{done}} of {{total}} complete' },
    )
  }

  /**
   * React's `showProgress = true` default: only an explicit `false` hides it.
   * @returns Whether the progress block renders.
   */
  showProgressEnabled(): boolean {
    return this.showProgress !== false
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
   * @param value - A label, description or title.
   * @returns True when the value is a string.
   */
  isText(value: unknown): value is string {
    return typeof value === 'string'
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A label, description or title.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * React's `aria-label`: the label text when it is a plain string, else the item id.
   * @param item - The checklist item.
   * @returns The accessible name.
   */
  ariaLabel(item: ChecklistItem): string {
    return typeof item.label === 'string' ? item.label : item.id
  }

  /**
   * React's controlled-checkbox `onChange`: report the input's new state.
   * @param item - The toggled item.
   * @param event - The click event React's checkbox change fires with.
   */
  toggle(item: ChecklistItem, event: Event): void {
    const target = event.target as HTMLInputElement
    this.onToggle?.(item.id, target.checked)
  }
}
