/**
 * TagList component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './tag-chip.component.js'

/**
 * TagList component — the Angular counterpart of
 * `@molecule/app-tag-input-react`'s `TagList`.
 *
 * Display all saved tags on a detail or preview screen, without an editor or
 * remove controls. The component owns iteration; the app can supply each
 * tag's content and the list classes. The host IS React's root `<ul>`
 * (`ul[mol-tag-list]`), and every saved tag renders as one `<li>` — the
 * default `TagChip` with the tag as its content, or the `renderTag`
 * template's content, duplicates included, in order.
 *
 * `renderTag` is a template reference called with the tag (`$implicit`/`a0`)
 * and its index (`a1`), as React's `renderTag(tag, index)` render prop is.
 */
@Component({
  selector: 'ul[mol-tag-list]',
  standalone: true,
  imports: [NgTemplateOutlet, TagChip],
  inputs: ['value', 'className', 'itemClassName', 'renderTag'],
  host: {
    '[class]': 'classes()',
  },
  // The template's whitespace is semantic (Angular keeps whitespace-only text
  // nodes between elements), so every block is glued and no literal text
  // separates them.
  // prettier-ignore
  template: `@for (tag of value; track $index) {<li [class]="itemClassName ?? ''">@if (renderTag) {<ng-container [ngTemplateOutlet]="renderTag" [ngTemplateOutletContext]="rowContext(tag, $index)"></ng-container>}@else {<span mol-tag-chip>{{ tag }}</span>}</li>}`,
})
export class TagList {
  /** Every saved tag, in display order. Empty arrays render an empty list. */
  value: readonly string[] = []
  /** Additional classes for the list. */
  className?: string
  /** Additional classes for each list item. */
  itemClassName?: string
  /**
   * Optional tag content; the component still renders every value. A template
   * reference whose context carries the tag as `$implicit`/`a0` and the index
   * as `a1`.
   */
  renderTag?: TemplateRef<{ $implicit: string; a0: string; a1: number }>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The list's class list (the caller's `className` included).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), this.className)
  }

  /**
   * The context a `renderTag` template renders with (React calls
   * `renderTag(tag, index)`).
   * @param tag - The item's tag.
   * @param index - The item's index.
   * @returns The template context.
   */
  rowContext(tag: string, index: number): Record<string, unknown> {
    return { $implicit: tag, a0: tag, a1: index, a2: undefined }
  }
}
