/**
 * TableToolbar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { templateOf, textOf } from './slot-dom.js'

/**
 * TableToolbar component.
 *
 * Table top-chrome row with left/right slots and an optional bottom sub-row for
 * active filter chips or tabs — the Angular counterpart of
 * `@molecule/app-data-table-ui-react`'s `TableToolbar`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input. The
 * host IS the outer stack `<div>` (`div[mol-table-toolbar]`), matching React's
 * root exactly. `left`, `right` and `below` are `[slot=…]` content,
 * `TemplateRef`s, or text.
 */
@Component({
  selector: 'div[mol-table-toolbar]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['left', 'right', 'below', 'className'],
  host: { '[class]': 'classes()' },
  template: `<div [class]="rowClasses()">
      <div [class]="sectionClasses()">
        <ng-content select="[slot=left]"></ng-content>
        @if (leftTemplate(); as tpl) {
          <ng-container [ngTemplateOutlet]="tpl" />
        }
        {{ leftText() }}
      </div>
      <div [class]="sectionClasses()">
        <ng-content select="[slot=right]"></ng-content>
        @if (rightTemplate(); as tpl) {
          <ng-container [ngTemplateOutlet]="tpl" />
        }
        {{ rightText() }}
      </div>
    </div>
    <ng-content select="[slot=below]"></ng-content>
    @if (belowTemplate(); as tpl) {
      <ng-container [ngTemplateOutlet]="tpl" />
    }
    {{ belowText() }}`,
})
export class TableToolbar {
  /** Left-aligned content (a `TemplateRef` or `[slot=left]` content). */
  left?: unknown
  /** Right-aligned actions (a `TemplateRef` or `[slot=right]` content). */
  right?: unknown
  /** Optional filter sub-row (a `TemplateRef` or `[slot=below]` content). */
  below?: unknown
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
   * The toolbar's class list (`stack(2)` + the caller's classes).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The left/right row's class list (`flex between/center, gap sm, wrap`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * One left/right section's class list (`flex center, gap sm`).
   * @returns The class string.
   */
  sectionClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
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

  /**
   * The filter row's text (React's `{below}` for text).
   * @returns The text, or `''` for a node row.
   */
  belowText(): string {
    return typeof this.below === 'string' || typeof this.below === 'number'
      ? textOf(this.below)
      : ''
  }

  /**
   * The filter row's template, when the caller passed a node.
   * @returns The template, or null.
   */
  belowTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.below)
  }
}
