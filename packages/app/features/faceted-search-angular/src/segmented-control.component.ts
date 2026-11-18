/**
 * SegmentedControl component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { textOf } from './slot-dom.js'
import type { SegmentedControlProps } from './types.js'

/**
 * SegmentedControl component.
 *
 * Pill-shaped segmented control: two or more options, the active one taking the
 * primary fill. The host IS the React root `<div>`
 * (`div[mol-faceted-search-segmented-control]`), carrying React's
 * `role="tablist"` and its class list. React keys each segment by the option's
 * `value`, and `@for` tracks the same key, so a re-passed or re-ordered array
 * keeps the rendered rows per value.
 */
@Component({
  selector: 'div[mol-faceted-search-segmented-control]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['options', 'value', 'onChange', 'className'],
  host: {
    role: 'tablist',
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (opt of options; track opt.value) {<button type="button" role="tab" [attr.aria-selected]="opt.value === value ? 'true' : 'false'" [attr.data-state]="opt.value === value ? 'active' : 'inactive'" [attr.data-mol-id]="opt.dataMolId ?? null" (click)="select(opt)" [class]="triggerClasses()">@if (isTemplate(opt.label)) {<ng-container [ngTemplateOutlet]="asTemplate(opt.label)"></ng-container>} @else {{{ optionText(opt) }}}</button>}`,
})
export class SegmentedControl {
  /** The segments to render. */
  options: SegmentedControlProps['options'] = []
  /** The currently selected segment's value. */
  value = ''
  /** Called with a segment's value when it is clicked (React's `onChange`). */
  onChange?: (next: string) => void
  /** Extra classes on the row. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list, exactly as React composes it.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().tabsList({ variant: 'solid-rounded', size: 'sm' }),
      this.className,
    )
  }

  /**
   * Computes a segment's class list, exactly as React composes it.
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().tabsTrigger({ variant: 'solid-rounded', size: 'sm' }),
      this.cm().fontWeight('semibold'),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * Whether a label is an embedded template rather than text.
   * @param label - The option's label.
   * @returns True when it renders through `ngTemplateOutlet`.
   */
  isTemplate(label: unknown): label is TemplateRef<unknown> {
    return (
      typeof label === 'object' &&
      label !== null &&
      typeof (label as TemplateRef<unknown>).createEmbeddedView === 'function'
    )
  }

  /**
   * Narrows a label to an embedded template.
   * @param label - The option's label.
   * @returns The template.
   */
  asTemplate(label: unknown): TemplateRef<unknown> {
    return label as TemplateRef<unknown>
  }

  /**
   * An option's label as text (React renders strings and numbers).
   * @param opt - The option.
   * @returns The text, or `''` when the label is an embedded template.
   */
  optionText(opt: SegmentedControlProps['options'][number]): string {
    return textOf(opt.label)
  }

  /**
   * Reports a segment's value, React's `onChange(opt.value)`.
   * @param opt - The clicked option.
   */
  select(opt: SegmentedControlProps['options'][number]): void {
    this.onChange?.(opt.value)
  }
}
