/**
 * SectionDivider component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * SectionDivider component.
 *
 * Horizontal divider with an optional centered label, common as "OR" between
 * auth options, "Today" between feed days, "—" between sections. The host IS
 * the outer `<div>` (`div[mol-section-divider]`), matching React's root
 * exactly; the label is the projected default content, wrapped in the same
 * span React renders. The label wrapper lives in the template unconditionally
 * (projected nodes need an always-mounted capture point) and is detached from
 * the DOM when React would not render it — `{children && …}`. `align`
 * positions the label: `'center'` (default) draws lines on both sides,
 * `'start'` / `'end'` put the label at that edge with a single line filling
 * the rest. The lines' declarations are written through the CSSOM
 * (`[style.border-top]` / `[style.opacity]`), exactly where React's inline
 * style lands: `currentColor` at 20% opacity, so they inherit the local text
 * color in both themes.
 */
@Component({
  selector: 'div[mol-section-divider]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['align', 'className'],
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
    '[class]': 'classes()',
  },
  template: `@if (showsLeadingLine()) {
      <span
        [class]="lineClasses()"
        aria-hidden="true"
        [style.border-top]="lineColor()"
        [style.opacity]="lineOpacity()"
      ></span>
    }
    <span [class]="labelClasses()" #labelSlot><ng-content></ng-content></span>
    @if (showsTrailingLine()) {
      <span
        [class]="lineClasses()"
        aria-hidden="true"
        [style.border-top]="lineColor()"
        [style.opacity]="lineOpacity()"
      ></span>
    }`,
})
export class SectionDivider {
  /** Where the label sits. Defaults to `'center'` at read time. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes on the outer `<div>`. */
  className?: string

  /** The label capture span (always in the template; detached when empty). */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>

  constructor() {
    usePlacement((hasContent) => this.syncLabel(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the divider class list (`cm.flex({ align: 'center', gap: 'sm' })`
   * + `className`, through `cn()` exactly as React computes it).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * The label span's class (`cm.textSize('xs')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * A flanking line's class (`cm.flex1`), through `cn()` so a token that is a
   * function in the bonded map resolves to its string — Angular's `[class]`
   * binding takes strings only.
   * @returns The class string.
   */
  lineClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * React's `align` default parameter: a later-bound write of `undefined`
   * must not erase the `'center'` default.
   * @returns The alignment.
   */
  alignment(): 'start' | 'center' | 'end' {
    return this.align ?? 'center'
  }

  /**
   * Whether the line before the label renders (`align` `'center'` or `'end'`).
   * @returns True when a leading line shows.
   */
  showsLeadingLine(): boolean {
    const align = this.alignment()
    return align === 'center' || align === 'end'
  }

  /**
   * Whether the line after the label renders (`align` `'center'` or `'start'`).
   * @returns True when a trailing line shows.
   */
  showsTrailingLine(): boolean {
    const align = this.alignment()
    return align === 'center' || align === 'start'
  }

  /**
   * The flanking line's border declaration (`currentColor` so it inherits the
   * text color).
   * @returns The `border-top` value.
   */
  lineColor(): string {
    return '1px solid currentColor'
  }

  /**
   * The flanking line's opacity.
   * @returns The opacity value.
   */
  lineOpacity(): string {
    return '0.2'
  }

  /**
   * Keeps the label wrapper in the DOM exactly while React renders it, at the
   * position Angular put it.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncLabel(hasContent: SlotReader): void {
    const span = this.labelSlot?.nativeElement
    setElementPresent(span, hasContent(span))
  }
}
