/**
 * NodeEditorSlider component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, signal, ViewChild } from '@angular/core'

import { isElementChild, MolPlacement, rendersNode, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Next value of the module-wide slider id counter.
 *
 * React derives the range input's id from `useId()`, which numbers ids from one
 * process-wide counter; the section label's `for` names the input by it, so the
 * port generates ids from the same kind of counter — unique per instance.
 */
let nextSliderId = 0

/**
 * NodeEditorSlider component.
 *
 * Range slider inside a labeled section, with the tiny mono-font value chip on
 * the right of the label row and the accent-primary track. The host IS the
 * outer `<div>` (`div[mol-node-editor-slider]`), matching React's root exactly.
 *
 * Node props are projected content: `label` is `[slot=label]` and
 * `valueDisplay` is `[slot=valueDisplay]`. Plain strings may also be passed as
 * inputs.
 *
 * @remarks
 * React renders `valueDisplay ?? value`, so a projected value display replaces
 * the numeric text. Angular needs the `<ng-content>` capture point mounted, so
 * the chip stays in the template and the placement function re-decides whether
 * to show the numeric fallback as the slot changes.
 */
@Component({
  selector: 'div[mol-node-editor-slider]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['label', 'value', 'onChange', 'min', 'max', 'step', 'valueDisplay'],
  host: {
    '[class]': 'classes()',
  },
  template: `<div [class]="rowClasses()">
      <label [class]="labelClasses()" [attr.for]="inputId">
        @if (hasLabel) {
          {{ label }}
        }
        <ng-content select="[slot=label]"
      /></label>
      <span #valueEl [class]="valueClasses()">
        @if (hasValueDisplay) {
          {{ valueDisplay }}
        } @else if (!valueDisplayProjected()) {
          {{ value }}
        }
        <ng-content select="[slot=valueDisplay]"
      /></span>
    </div>
    <input
      #rangeInput
      [class]="inputClasses()"
      [attr.id]="inputId"
      [attr.aria-valuetext]="valueText()"
      [attr.min]="minOf()"
      [attr.max]="maxOf()"
      [attr.step]="stepOf()"
      type="range"
      [attr.value]="value"
      (change)="handleChange($event)"
    />`,
})
export class NodeEditorSlider {
  /** Slider label — a string input, or `[slot=label]` projected content. */
  label?: unknown
  /** Current numeric value. */
  value!: number
  /** Called with the parsed value of every change. */
  onChange?: (next: number) => void
  /** Lower bound (React's default `0` applied at read time). */
  min?: number
  /** Upper bound (React's default `1` applied at read time). */
  max?: number
  /** Step increment (React's default `0.1` applied at read time). */
  step?: number
  /** Value chip override — a string input, or `[slot=valueDisplay]` projected content. */
  valueDisplay?: unknown

  /**
   * The range input's id, which the label's `for` names (React derives it
   * from `useId()`; a per-instance counter gives each instance its own).
   */
  readonly inputId = `node-editor-slider-${nextSliderId++}`

  /** The value chip span (projected content lands here; placement reads it). */
  @ViewChild('valueEl', { static: true }) private valueEl?: ElementRef<HTMLElement>
  /** The range input (React's controlled restore target). */
  @ViewChild('rangeInput') private rangeInput?: ElementRef<HTMLInputElement>

  /** Whether a `[slot=valueDisplay]` projection landed, re-decided as the slot changes. */
  private readonly valueDisplayProjected = signal(false)

  /**
   * Renders the numeric fallback only while nothing is projected into the chip:
   * a projected child is an element (the chip's own fallback text is not).
   */
  constructor() {
    usePlacement((hasContent) => {
      const valueEl = this.valueEl?.nativeElement
      this.valueDisplayProjected.set(
        valueEl ? hasContent.nodes(valueEl).some(isElementChild) : false,
      )
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether a string label input renders (a projected label is not).
   * @returns True when the label input renders as text.
   */
  get hasLabel(): boolean {
    return rendersNode(this.label)
  }

  /**
   * Whether a string value-display input renders (React's `slot(valueDisplay) ?? value`: an
   * empty value display shows the value).
   * @returns True when the value display input renders as text.
   */
  get hasValueDisplay(): boolean {
    return rendersNode(this.valueDisplay)
  }

  /**
   * Lower bound with React's default.
   * @returns The minimum.
   */
  minOf(): number {
    return this.min ?? 0
  }

  /**
   * Upper bound with React's default.
   * @returns The maximum.
   */
  maxOf(): number {
    return this.max ?? 1
  }

  /**
   * Step with React's default.
   * @returns The step.
   */
  stepOf(): number {
    return this.step ?? 0.1
  }

  /**
   * The input's `aria-valuetext`: React sets it when `valueDisplay` is a
   * string, so the announced value matches the chip.
   * @returns The value text, or undefined when no string override is given.
   */
  valueText(): string | undefined {
    // React's `typeof slot(valueDisplay) === 'string'`: an empty one names nothing.
    return typeof this.valueDisplay === 'string' && rendersNode(this.valueDisplay)
      ? this.valueDisplay
      : undefined
  }

  /**
   * Parses the range input's value, reports it, then restores the controlled
   * value in the DOM as React does after a change.
   * @param event - The native change event.
   */
  handleChange(event: Event): void {
    const element = event.target as HTMLInputElement
    this.onChange?.(parseFloat(element.value))
    element.value = String(this.value)
  }

  /**
   * The host's class list (React's `cm.stack(3)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().stack(3)
  }

  /**
   * The label row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center' })
  }

  /**
   * The label's class list.
   * @returns The class string.
   */
  labelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelSectionLabel)
  }

  /**
   * The value chip's class list.
   * @returns The class string.
   */
  valueClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.sp('px', 2), cm.nodeEditorPanelSliderValue)
  }

  /**
   * The range input's class list.
   * @returns The class string.
   */
  inputClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w('full'), cm.h(1.5), cm.cursorPointer, cm.nodeEditorPanelSliderTrack)
  }
}
