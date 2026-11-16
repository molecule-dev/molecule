/**
 * ChartLegend component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { ChartLegendItem, ChartLegendProps } from './types.js'

/**
 * ChartLegend component.
 *
 * Swatch + label (+ optional value) per series. When `onToggle` is provided,
 * items become buttons that toggle series visibility. The host IS the legend
 * `div` (`div[mol-chart-legend]`), matching React's root exactly.
 *
 * This is the Angular counterpart of `@molecule/app-chart-wrapper-react`.
 */
@Component({
  selector: 'div[mol-chart-legend]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'onToggle', 'layout', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<ng-template #row let-item><span [class]="contentClasses()"><span aria-hidden="true" [style]="swatchStyle(item)"></span><span [class]="labelClasses(item)" [style]="item.hidden ? 'opacity: 0.5' : null">@if (isNode(item.label)) {<ng-container [ngTemplateOutlet]="templateOf(item.label)"></ng-container>}@else {{{ textOf(item.label) }}}</span>@if (item.value !== undefined) {<span [class]="valueClasses()">@if (isNode(item.value)) {<ng-container [ngTemplateOutlet]="templateOf(item.value)"></ng-container>}@else {{{ textOf(item.value) }}}</span>}</span></ng-template>@for (item of items; track item.id) {@if (hasToggle()) {<button type="button" (click)="toggle(item.id)" [attr.aria-pressed]="!item.hidden"><ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{$implicit: item}"></ng-container></button>}@else {<span><ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{$implicit: item}"></ng-container></span>}}`,
})
export class ChartLegend {
  /** The legend's series. */
  items: ChartLegendProps['items'] = []
  /** Called when an item is toggled; when absent, items are plain spans. */
  onToggle?: (id: string) => void
  /** Layout direction. Defaults to `'horizontal'`. */
  layout?: 'horizontal' | 'vertical'
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
   * Whether the items render as toggle buttons (React's `onToggle` presence).
   * @returns True when `onToggle` is set.
   */
  hasToggle(): boolean {
    return typeof this.onToggle === 'function'
  }

  /**
   * Calls `onToggle` for the clicked series.
   * @param id - The series id.
   */
  toggle(id: string): void {
    this.onToggle?.(id)
  }

  /**
   * Whether an item field is projected markup rather than plain text.
   * @param value - The field value.
   * @returns True for a template reference.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows an item field to its template reference.
   * @param value - The field value.
   * @returns The template reference, or null for plain text.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * Renders an item field as plain text.
   * @param value - The field value.
   * @returns The text.
   */
  textOf(value: unknown): string {
    return value === undefined || value === null ? '' : String(value)
  }

  /**
   * The legend's class list (React's flex classes plus `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({
        direction: this.layout === 'vertical' ? 'col' : 'row',
        align: 'center',
        gap: 'md',
        wrap: 'wrap',
      }),
      this.className,
    )
  }

  /**
   * The item content row class (`cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The label class (React's `cm.textSize('sm')`, repeated when hidden).
   * @param item - The series entry.
   * @returns The class string.
   */
  labelClasses(item: ChartLegendItem): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      item.hidden ? this.cm().textSize('sm') : undefined,
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
   * The swatch's inline style (React's object).
   * @param item - The series entry.
   * @returns The style attribute text.
   */
  swatchStyle(item: ChartLegendItem): string {
    return (
      styleText({
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: 2,
        background: item.color,
        opacity: item.hidden ? 0.3 : 1,
      }) ?? ''
    )
  }
}
