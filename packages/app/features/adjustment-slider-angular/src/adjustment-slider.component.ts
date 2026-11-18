/**
 * AdjustmentSlider component (React parity).
 *
 * @module
 */

import { type AfterViewChecked, Component, ElementRef, inject } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { AdjustmentSliderProps } from './types.js'
import { clampStep, defaultFormatter, defaultResetValue, keyboardNudge } from './utilities.js'

/**
 * AdjustmentSlider component.
 *
 * Bipolar (zero-center) adjustment slider — a labelled `<input type="range">`
 * tuned for photo-editor / DAW / animation parameter controls (brightness,
 * contrast, saturation, exposure, gain, pan, etc.). The host IS the outer
 * `<div>` (`div[mol-adjustment-slider]`), matching React's root exactly.
 *
 * Behaviour:
 * - When `bipolar` is `true` (default), a center mark is rendered at zero
 *   and the reset target is `0`. When `false`, the slider is unipolar and
 *   the reset target is `min`.
 * - Double-clicking the input resets the value (calling `onReset` if
 *   provided, otherwise emitting `defaultResetValue(min, bipolar)` via
 *   `onChange`).
 * - Up/Right arrows nudge by `step`; Down/Left arrows nudge by `-step`.
 *   Holding Shift multiplies the nudge by 10.
 * - The numeric value display is formatted via `format` if supplied,
 *   otherwise via `value + (unit || '')`.
 *
 * Text is read through the binding's reactive `useTranslation()`, so a locale
 * switch re-renders the translated `aria-label`s.
 */
@Component({
  selector: 'div[mol-adjustment-slider]',
  standalone: true,
  inputs: [
    'label',
    'value',
    'onChange',
    'min',
    'max',
    'step',
    'bipolar',
    'unit',
    'format',
    'onReset',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': "dataMolId ?? 'adjustment-slider'",
  },
  template: `<div [class]="rowClasses()">
      <span [class]="labelClasses()">{{ label }}</span>
      <button
        type="button"
        (click)="performReset()"
        [attr.aria-label]="resetAria()"
        [class]="buttonClasses()"
        data-mol-id="adjustment-slider-reset"
      >
        {{ display() }}
      </button>
    </div>
    <div style="position: relative">
      @if (showCenterMark()) {
        <span
          aria-hidden="true"
          data-mol-id="adjustment-slider-center-mark"
          [style]="centerMarkStyle()"
        ></span>
      }
      <input
        type="range"
        [attr.min]="minOf()"
        [attr.max]="maxOf()"
        [attr.step]="stepOf()"
        [attr.value]="value"
        (input)="handleChange($event)"
        (keydown)="handleKeyDown($event)"
        (dblclick)="performReset()"
        [attr.aria-label]="sliderAria()"
        data-mol-id="adjustment-slider-input"
        style="width: 100%"
      />
    </div>`,
})
export class AdjustmentSlider implements AfterViewChecked {
  /** Visible label (rendered to the left of the slider). */
  label!: string
  /** Current numeric value. */
  value!: number
  /** Called whenever the slider value changes (React's `onChange` input). */
  onChange?: AdjustmentSliderProps['onChange']
  /** Lower bound (React's default `-100` applied at read time). */
  min?: number
  /** Upper bound (React's default `100` applied at read time). */
  max?: number
  /** Step increment (React's default `1` applied at read time). */
  step?: number
  /** Bipolar / zero-center mode (React's default `true` applied at read time). */
  bipolar?: boolean
  /** Optional unit suffix (e.g. `'%'`, `'dB'`) appended to the default formatter. */
  unit?: string
  /** Optional formatter overriding the default value display. */
  format?: AdjustmentSliderProps['format']
  /** Optional reset handler (React's `onReset` input). */
  onReset?: AdjustmentSliderProps['onReset']
  /** Extra classes on the outer container. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E targeting. */
  dataMolId?: string

  /** The host element (the outer `<div>`). */
  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale notifications, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer container's class list (React's `cm.cn(cm.stack(1), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * The label/display row's class (React's `cm.flex({ align, justify, gap })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * The label's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('medium'))
  }

  /**
   * The reset button's class list (React's `cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(
      this.cm().button({ variant: 'ghost', size: 'xs' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The lower bound, with React's default.
   * @returns The minimum.
   */
  minOf(): number {
    return this.min ?? -100
  }

  /**
   * The upper bound, with React's default.
   * @returns The maximum.
   */
  maxOf(): number {
    return this.max ?? 100
  }

  /**
   * The step increment, with React's default.
   * @returns The step.
   */
  stepOf(): number {
    return this.step ?? 1
  }

  /**
   * The bipolar mode, with React's default.
   * @returns Whether the slider is bipolar.
   */
  isBipolar(): boolean {
    return this.bipolar ?? true
  }

  /**
   * The formatted value display (React's `format ?? defaultFormatter(unit)`).
   * @returns The display text.
   */
  display(): string {
    const formatter = this.format ?? defaultFormatter(this.unit)
    return formatter(this.value)
  }

  /**
   * Whether the center mark renders (bipolar AND the range crosses zero).
   * @returns True when the mark is shown.
   */
  showCenterMark(): boolean {
    return this.isBipolar() && this.minOf() < 0 && this.maxOf() > 0
  }

  /**
   * The center mark's inline style, positioned proportionally between min..max.
   * @returns The style map.
   */
  centerMarkStyle(): Record<string, string> {
    const percent = this.showCenterMark()
      ? ((0 - this.minOf()) / (this.maxOf() - this.minOf())) * 100
      : 50
    return {
      position: 'absolute',
      left: `${percent}%`,
      top: '50%',
      width: '1px',
      height: '8px',
      transform: 'translate(-50%, -50%)',
      background: 'currentColor',
      opacity: '0.5',
      'pointer-events': 'none',
    }
  }

  /**
   * The reset button's `aria-label`.
   * @returns The translated label.
   */
  resetAria(): string {
    return this.i18n.t(
      'adjustmentSlider.reset.aria',
      { label: this.label },
      { defaultValue: 'Reset {{label}}' },
    )
  }

  /**
   * The range input's `aria-label`.
   * @returns The translated label.
   */
  sliderAria(): string {
    return this.i18n.t(
      'adjustmentSlider.aria',
      { label: this.label },
      { defaultValue: '{{label}}' },
    )
  }

  /**
   * Emits a value through `onChange`, clamped + step-snapped, and only when it
   * differs from the current controlled value (React's `emit`).
   * @param next - The proposed value.
   */
  private emit(next: number): void {
    const normalized = clampStep(next, this.minOf(), this.maxOf(), this.stepOf())
    if (normalized !== this.value) this.onChange?.(normalized)
  }

  /** Resets the value: `onReset` when supplied, otherwise the default target. */
  performReset(): void {
    if (this.onReset) {
      this.onReset()
      return
    }
    this.emit(defaultResetValue(this.minOf(), this.isBipolar()))
  }

  /**
   * Handles the native `input` event: emits the typed value, then applies
   * React's controlled-input restore (the DOM value returns to the prop).
   * @param event - The native input event.
   */
  handleChange(event: Event): void {
    const element = event.target as HTMLInputElement
    this.emit(Number(element.value))
    element.value = String(this.value)
  }

  /**
   * Intercepts Shift + arrow keys and nudges by ten steps (the native range
   * input already handles plain arrows).
   * @param event - The native keydown event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!event.shiftKey) return
    const delta = keyboardNudge(this.stepOf(), true)
    let next: number | undefined
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = this.value + delta
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = this.value - delta
    if (next === undefined) return
    event.preventDefault()
    this.emit(next)
  }

  /**
   * Keeps the range input's live value on the controlled prop, as React does.
   * This runs AFTER the view's bindings are applied (so `min` / `max` exist and
   * the range input can hold the value), and on every later pass covers the
   * case where the user has dragged — after which the `value` attribute alone no
   * longer reaches the property.
   */
  ngAfterViewChecked(): void {
    const input = (this.el.nativeElement as HTMLElement).querySelector('input')
    if (!input) return
    const text = String(this.value)
    if (input.value !== text) input.value = text
  }
}
