/**
 * TableFooter component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { templateOf, textOf } from './slot-dom.js'

/**
 * TableFooter component.
 *
 * Footer bar rendered below a table — the Angular counterpart of
 * `@molecule/app-data-table-ui-react`'s `TableFooter`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input. The
 * host IS the outer `<div>` (`div[mol-table-footer]`), matching React's root
 * exactly. Both slots always render as their own `<div>`; `left` and `right`
 * are `[slot=…]` content, `TemplateRef`s, or text.
 */
@Component({
  selector: 'div[mol-table-footer]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['left', 'right', 'className'],
  host: { '[class]': 'classes()' },
  template: `<div>
      <ng-content select="[slot=left]"></ng-content>
      @if (leftTemplate(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl" />
      }
      {{ leftText() }}
    </div>
    <div>
      <ng-content select="[slot=right]"></ng-content>
      @if (rightTemplate(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl" />
      }
      {{ rightText() }}
    </div>`,
})
export class TableFooter {
  /** Left slot — typically a summary line (a `TemplateRef` or `[slot=left]` content). */
  left?: unknown
  /** Right slot — typically a pagination bar (a `TemplateRef` or `[slot=right]` content). */
  right?: unknown
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
   * The bar's class list (`flex between/center, gap sm, wrap` + `pt-3` + the
   * caller's classes).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' }),
      this.cm().sp('pt', 3),
      this.className,
    )
  }

  /**
   * The left slot's text (React's `{left}` for text).
   * @returns The text, or `''` for a node slot.
   */
  leftText(): string {
    return typeof this.left === 'string' || typeof this.left === 'number' ? textOf(this.left) : ''
  }

  /**
   * The left slot's template, when the caller passed a node.
   * @returns The template, or null.
   */
  leftTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.left)
  }

  /**
   * The right slot's text (React's `{right}` for text).
   * @returns The text, or `''` for a node slot.
   */
  rightText(): string {
    return typeof this.right === 'string' || typeof this.right === 'number'
      ? textOf(this.right)
      : ''
  }

  /**
   * The right slot's template, when the caller passed a node.
   * @returns The template, or null.
   */
  rightTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.right)
  }
}
