/**
 * BentoGrid component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { BentoItem } from './types.js'

/**
 * BentoGrid component.
 *
 * Items span multiple cells for a magazine / dashboard layout. The host IS the
 * root `<div>` (`div[mol-bento-grid]`), matching React's root exactly. Works in
 * two modes: (a) col/row-span driven, (b) named-areas driven via the `areas`
 * input. Node-valued item content is an `ng-template` reference rendered
 * through `NgTemplateOutlet`; string / number content renders as text.
 */
@Component({
  selector: 'div[mol-bento-grid]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'areas', 'columns', 'gap', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.display]': "'grid'",
    '[style.grid-template-columns]': 'gridTemplateColumns()',
    '[style.grid-template-areas]': 'gridTemplateAreas()',
  },
  template: `@for (item of items; track item.id) {
    <div [attr.style]="itemStyle(item)">
      @if (isNode(item.content)) {
        <ng-container [ngTemplateOutlet]="item.content" />
      } @else {
        <ng-container>{{ textOf(item.content) }}</ng-container>
      }
    </div>
  }`,
})
export class BentoGrid {
  /** Items to render. */
  items: BentoItem[] = []
  /** Optional `grid-template-areas` string. */
  areas?: string
  /** Default column count when `areas` is absent (defaults to `12`). */
  columns?: number
  /** Gap between items (defaults to `'md'` at read time). */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
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
   * Computes the grid class list (React's `cm.grid({ gap })` plus the extra
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().grid({ gap: this.gap ?? 'md' }), this.className)
  }

  /**
   * The host's `grid-template-columns` in span mode; absent in areas mode
   * (React writes one or the other).
   * @returns The CSS value, or null for no declaration.
   */
  gridTemplateColumns(): string | null {
    return this.areas ? null : `repeat(${this.columns ?? 12}, minmax(0, 1fr))`
  }

  /**
   * The host's `grid-template-areas` in areas mode; absent in span mode.
   * @returns The CSS value, or null for no declaration.
   */
  gridTemplateAreas(): string | null {
    return this.areas ?? null
  }

  /**
   * An item's whole style attribute: React's `{ gridColumn, gridRow }` in span mode, its
   * `{ gridArea }` in areas mode, and none for an item that sets no area.
   *
   * One attribute binding rather than `[style.grid-column]`, `[style.grid-row]` and
   * `[style.grid-area]`: `grid-area` is the shorthand of the other two, so Angular removing the
   * null `grid-area` binding also removed both spans, and a browser laid every item out at span 1.
   * A `[style]` map binding has the same fault on a span-to-areas switch, because Angular applies
   * map changes in key order (it sets `grid-area`, then removes `grid-column` from it).
   * @param item - The item.
   * @returns The style text, or null for no style attribute.
   */
  itemStyle(item: BentoItem): string | null {
    if (!this.areas)
      return `grid-column: span ${item.colSpan ?? 4}; grid-row: span ${item.rowSpan ?? 1}`
    return item.area ? `grid-area: ${item.area}` : null
  }

  /**
   * Whether item content holds a node (an `ng-template` reference) rather than
   * text.
   * @param value - The item content.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: BentoItem['content']): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * The text a content field renders (React renders strings and numbers as
   * text).
   * @param value - The item content.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: BentoItem['content']): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
