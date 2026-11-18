/**
 * TableEmpty component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { templateOf, textOf } from './slot-dom.js'

/**
 * TableEmpty component.
 *
 * Single full-width row shown when a table has no data — the Angular
 * counterpart of `@molecule/app-data-table-ui-react`'s `TableEmpty`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input. The host IS the `<tr>` (`tr[mol-table-empty]`), matching React's root
 * exactly; the empty state is the element's default projected content, a
 * `TemplateRef`, or text.
 */
@Component({
  selector: 'tr[mol-table-empty]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['colSpan', 'children', 'className'],
  template: `<td [attr.colspan]="colSpan ?? null" [class]="cellClasses()">
    <ng-content></ng-content>
    @if (childTemplate(); as tpl) {
      <ng-container [ngTemplateOutlet]="tpl" />
    }
    {{ childText() }}
  </td>`,
})
export class TableEmpty {
  /** Number of columns to span. */
  colSpan?: number
  /** Empty-state content as text (nodes are projected as default content). */
  children?: unknown
  /** Extra classes on the cell. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The cell's class list (`py-10` + `text-center` + the caller's classes).
   * @returns The class string.
   */
  cellClasses(): string {
    return this.cm().cn(this.cm().sp('py', 10), this.cm().textCenter, this.className)
  }

  /**
   * The content's text (React's `{children}` for text).
   * @returns The text, or `''` for a node child.
   */
  childText(): string {
    return typeof this.children === 'string' || typeof this.children === 'number'
      ? textOf(this.children)
      : ''
  }

  /**
   * The content's template, when the caller passed a node.
   * @returns The template, or null.
   */
  childTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.children)
  }
}
