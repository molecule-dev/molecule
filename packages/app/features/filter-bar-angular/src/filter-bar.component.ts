/**
 * FilterBar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-angular'

import type { FilterField, FilterValues } from './types.js'

/**
 * FilterBar component.
 *
 * Data-driven filter bar. One control per field in `fields`, a full updated
 * values map on each change so parents can store filters in URL params,
 * signals, etc. The host IS the outer `<div>` (`div[mol-filter-bar]`),
 * matching React's root exactly, so its class list is the row's.
 *
 * This is the Angular counterpart of `@molecule/app-filter-bar-react`: the
 * same props (React names) and the same DOM for the same input. The
 * right-side `actions` slot is projected content (`[slot=actions]`), moved
 * out of its capture span at view init exactly as React renders it — bare.
 */
@Component({
  selector: 'div[mol-filter-bar]',
  standalone: true,
  imports: [Button, Input, NgTemplateOutlet, Select],
  inputs: ['fields', 'values', 'onChange', 'onClear', 'showLabels', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `@for (f of fields; track f.id) {
      @if (showLabels) {
        <label [class]="labelWrapperClasses()">
          <span [class]="labelClasses()">{{ f.label }}</span>
          <ng-container
            [ngTemplateOutlet]="control"
            [ngTemplateOutletContext]="{ $implicit: f }"
          ></ng-container>
        </label>
      } @else {
        <ng-container
          [ngTemplateOutlet]="control"
          [ngTemplateOutletContext]="{ $implicit: f }"
        ></ng-container>
      }
    }
    @if (onClear) {
      <button mol-button [variant]="'ghost'" [size]="'sm'" (click)="clearAll($event)">
        {{ clearText() }}
      </button>
    }
    <span #actionsSlot><ng-content select="[slot=actions]"></ng-content></span>

    <ng-template #control let-f>
      @if (f.type === 'text') {
        <div
          mol-input
          [id]="controlId(f)"
          [type]="'text'"
          [value]="textValue(f)"
          (change)="handleText(f, $event)"
          [placeholder]="f.placeholder ?? f.label"
          [attr.aria-label]="f.label"
        ></div>
      } @else if (f.type === 'select') {
        <div
          mol-select
          [id]="controlId(f)"
          [options]="f.options"
          [value]="textValue(f)"
          (valueChange)="setField(f.id, $event)"
          [attr.aria-label]="f.label"
        ></div>
      } @else if (f.type === 'multi') {
        <div
          mol-input
          [id]="controlId(f)"
          [type]="'text'"
          [value]="multiValue(f)"
          (change)="handleMulti(f, $event)"
          [placeholder]="f.placeholder ?? f.label"
          [attr.aria-label]="f.label"
        ></div>
      } @else {
        <span [class]="rangeClasses()">
          <div
            mol-input
            [id]="controlId(f) + '-from'"
            [type]="'date'"
            [value]="rangeValue(f).from ?? ''"
            (change)="handleFrom(f, $event)"
            [attr.aria-label]="fromLabel(f)"
          ></div>
          <span>–</span>
          <div
            mol-input
            [id]="controlId(f) + '-to'"
            [type]="'date'"
            [value]="rangeValue(f).to ?? ''"
            (change)="handleTo(f, $event)"
            [attr.aria-label]="toLabel(f)"
          ></div>
        </span>
      }
    </ng-template>`,
})
export class FilterBar implements AfterViewInit {
  /** Field definitions. */
  fields: FilterField[] = []
  /** Current filter values keyed by field id. */
  values: FilterValues = {}
  /** Called on any individual field change. */
  onChange: ((next: FilterValues) => void) | undefined
  /** Optional "Clear all" handler — renders a clear button when provided. */
  onClear?: () => void
  /** Renders each field's label above its control. */
  showLabels = false
  /** Extra classes on the outer row. */
  className?: string

  /** The actions slot capture span (its nodes are moved out once, at view init). */
  @ViewChild('actionsSlot') actionsSlot?: ElementRef<HTMLSpanElement>

  private readonly renderer = inject(Renderer2)

  private readonly translate = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({
        align: this.showLabels ? 'end' : 'center',
        gap: 'sm',
        wrap: 'wrap',
      }),
      this.className,
    )
  }

  /**
   * The class of the labeled field's wrapper `<label>`.
   * @returns The class string.
   */
  labelWrapperClasses(): string {
    return this.cm().cn(this.cm().flex({ direction: 'col', gap: 'xs' }))
  }

  /**
   * The class of the labeled field's eyebrow `<span>`.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('bold'),
      this.cm().uppercase,
      this.cm().trackingWide,
      this.cm().textMuted,
    )
  }

  /**
   * The class of a date-range field's wrapper `<span>`.
   * @returns The class string.
   */
  rangeClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }))
  }

  /**
   * A stable generated id for a field's control (`r0` for every instance in
   * the UI package would collide across a row of fields; the conformance
   * normalizer renumbers generated ids in order of appearance, exactly as it
   * does React's `useId` values).
   *
   * @param f - The field definition.
   * @returns The control's id.
   */
  controlId(f: FilterField): string {
    return `filter-bar-${f.id}`
  }

  /**
   * The text-like value of a field.
   *
   * @param f - The field definition.
   * @returns The field's current text value (empty when unset).
   */
  textValue(f: FilterField): string {
    return (this.values[f.id] as string) ?? ''
  }

  /**
   * The comma-joined value of a multi field.
   *
   * @param f - The field definition.
   * @returns The comma-joined values.
   */
  multiValue(f: FilterField): string {
    return ((this.values[f.id] as string[] | undefined) ?? []).join(', ')
  }

  /**
   * The bounds of a date-range field.
   *
   * @param f - The field definition.
   * @returns The stored from/to bounds.
   */
  rangeValue(f: FilterField): { from?: string; to?: string } {
    return (this.values[f.id] as { from?: string; to?: string } | undefined) ?? {}
  }

  /**
   * The translated aria-label of a date-range field's "from" input.
   *
   * @param f - The field definition.
   * @returns The label text.
   */
  fromLabel(f: FilterField): string {
    return this.translate.t(
      'filterBar.from',
      { label: f.label },
      { defaultValue: '{{label}} from' },
    )
  }

  /**
   * The translated aria-label of a date-range field's "to" input.
   *
   * @param f - The field definition.
   * @returns The label text.
   */
  toLabel(f: FilterField): string {
    return this.translate.t('filterBar.to', { label: f.label }, { defaultValue: '{{label}} to' })
  }

  /**
   * The clear button's text.
   * @returns The translated text.
   */
  clearText(): string {
    return this.translate.t('filterBar.clear', {}, { defaultValue: 'Clear filters' })
  }

  /**
   * Updates a single field in the filter values and notifies the parent.
   *
   * @param id - The field id to update.
   * @param v - The field's new value.
   */
  setField(id: string, v: FilterValues[string]): void {
    this.onChange?.({ ...this.values, [id]: v })
  }

  /**
   * Handles a text field's change event.
   *
   * @param f - The field definition.
   * @param event - The native change event.
   */
  handleText(f: FilterField, event: Event): void {
    this.setField(f.id, (event.target as HTMLInputElement).value)
  }

  /**
   * Handles a multi field's change event, splitting on commas.
   *
   * @param f - The field definition.
   * @param event - The native change event.
   */
  handleMulti(f: FilterField, event: Event): void {
    this.setField(
      f.id,
      (event.target as HTMLInputElement).value
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
    )
  }

  /**
   * Handles a date-range "from" change, keeping the other bound.
   *
   * @param f - The field definition.
   * @param event - The native change event.
   */
  handleFrom(f: FilterField, event: Event): void {
    this.setField(f.id, { ...this.rangeValue(f), from: (event.target as HTMLInputElement).value })
  }

  /**
   * Handles a date-range "to" change, keeping the other bound.
   *
   * @param f - The field definition.
   * @param event - The native change event.
   */
  handleTo(f: FilterField, event: Event): void {
    this.setField(f.id, { ...this.rangeValue(f), to: (event.target as HTMLInputElement).value })
  }

  /**
   * Calls `onClear` with the click event, the way React hands `onClick` the
   * event object.
   *
   * @param event - The click event.
   */
  clearAll(event: MouseEvent): void {
    const notify: ((e: MouseEvent) => void) | undefined = this.onClear
    notify?.(event)
  }

  /**
   * Moves the projected actions out of their capture span to its position and
   * detaches the span — React renders `{actions}` with no wrapper element.
   */
  ngAfterViewInit(): void {
    const span = this.actionsSlot?.nativeElement
    const parent = span?.parentElement
    if (!span || !parent) return
    const anchor = this.renderer.createComment('slot')
    parent.insertBefore(anchor, span)
    for (const node of Array.from(span.childNodes)) parent.insertBefore(node, anchor)
    parent.removeChild(span)
  }
}
