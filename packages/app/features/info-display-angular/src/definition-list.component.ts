/**
 * DefinitionList component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate } from '@molecule/app-ui-angular'

import type { DefinitionField } from './types.js'

/**
 * DefinitionList component.
 *
 * Structured label/value pair list, standalone or inside
 * {@link InfoCard}-style cards. The host IS the `<dl>` (`dl[mol-definition-list]`),
 * matching React's root exactly. `columns={1}` stacks each label above its
 * value; `2`/`3` arrange the fields in a grid. Node-valued `label`, `value`
 * and `icon` fields are `ng-template` references rendered through
 * `NgTemplateOutlet`; string / number fields render as text — React's contract.
 */
@Component({
  selector: 'dl[mol-definition-list]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['fields', 'columns', 'className'],
  host: {
    '[class]': 'listClasses()',
  },
  // prettier-ignore
  template: `@for (field of fields; track $index) {<div [class]="itemClasses()"><dt [class]="termClasses()">@if (templateOf(field.icon); as icon) {<ng-container [ngTemplateOutlet]="icon" />}@else if (textOf(field.icon)) {<ng-container>{{ textOf(field.icon) }}</ng-container>}<span>@if (templateOf(field.label); as label) {<ng-container [ngTemplateOutlet]="label" />}@else {<ng-container>{{ textOf(field.label) }}</ng-container>}</span></dt><dd [class]="valueClasses()">@if (templateOf(field.value); as value) {<ng-container [ngTemplateOutlet]="value" />}@else {<ng-container>{{ textOf(field.value) }}</ng-container>}</dd></div>}`,
})
export class DefinitionList {
  /** Fields to render. */
  fields!: DefinitionField[]
  /** Grid column count (React's default parameter: `1` at read time). */
  columns?: 1 | 2 | 3
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The effective column count (React's `columns = 1` default).
   * @returns The column count.
   */
  columnsValue(): 1 | 2 | 3 {
    return this.columns ?? 1
  }

  /**
   * Computes the list class list: a stack at one column, a grid above it.
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(
      this.columnsValue() === 1
        ? this.cm().stack(3)
        : this.cm().grid({ cols: this.columnsValue(), gap: 'md' }),
      this.className,
    )
  }

  /**
   * The per-field wrapper class (`cm.stack(0)`).
   * @returns The class string.
   */
  itemClasses(): string {
    return this.cm().stack(0)
  }

  /**
   * The term class (`cm.textSize('xs')` + `cm.fontWeight('semibold')` +
   * `cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  termClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.cm().flex({ align: 'center', gap: 'xs' }),
    )
  }

  /**
   * The value class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  valueClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * A node-valued field as a template, when it is one.
   * @param value - The field value.
   * @returns The template, or null for text.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return asTemplate(value)
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The field value.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
