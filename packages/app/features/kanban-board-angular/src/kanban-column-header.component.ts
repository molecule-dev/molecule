/**
 * KanbanColumnHeader component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { isTemplate, templateOf, textOf } from './nodes.js'

/**
 * Kanban column heading row — title + count + right actions.
 *
 * The Angular counterpart of `@molecule/app-kanban-board-react`'s
 * `KanbanColumnHeader`: the same props (React names) and the same DOM for the
 * same input. The host IS the `<header>` (`header[mol-kanban-column-header]`),
 * matching React's root exactly. The title is text, a template reference, or
 * `[slot=title]` projected content; the actions are a template reference or
 * `[slot=actions]` projected content.
 */
@Component({
  selector: 'header[mol-kanban-column-header]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['title', 'count', 'actions', 'actionsContext', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="titleRowClasses()"><span [class]="titleClasses()">@if (isTemplate(title)) {<ng-container [ngTemplateOutlet]="templateOf(title)"></ng-container>}@else {{{ textOf(title) }}}<ng-content select="[slot=title]" /></span>@if (hasCount()) {<span [class]="countClasses()">({{ count }})</span>}</div>@if (actions) {<ng-container [ngTemplateOutlet]="actions" [ngTemplateOutletContext]="actionsContext"></ng-container>}<ng-content select="[slot=actions]" />`,
})
export class KanbanColumnHeader {
  /** Column heading: text, a template reference, or projected content. */
  title?: string | number | TemplateRef<unknown>
  /** Card count shown in parentheses. */
  count?: number
  /** Optional right-side actions template. */
  actions?: TemplateRef<unknown>
  /**
   * The outlet context for `actions` — `{ a0: column }`, the argument React
   * passes to `renderHeaderActions`.
   */
  actionsContext?: Record<string, unknown>
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The header's class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
      this.cm().sp('pb', 2),
      this.className,
    )
  }

  /**
   * The title row's class list.
   *
   * @returns The class string.
   */
  titleRowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }))
  }

  /**
   * The title span's class list.
   *
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The count span's class list.
   *
   * @returns The class string.
   */
  countClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Whether the count renders — React renders it for any number, `0` included.
   *
   * @returns True when `count` is a number.
   */
  hasCount(): boolean {
    return typeof this.count === 'number'
  }

  /**
   * Whether a field is a template reference.
   *
   * @param value - The value.
   * @returns True when it is a template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value as string | number | TemplateRef<unknown> | undefined)
  }

  /**
   * Narrows a field to its template reference.
   *
   * @param value - The field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return templateOf(value as string | number | TemplateRef<unknown> | undefined)
  }

  /**
   * The text a field renders.
   *
   * @param value - The field.
   * @returns The text.
   */
  textOf(value: unknown): string {
    return textOf(value as string | number | TemplateRef<unknown> | undefined)
  }
}
