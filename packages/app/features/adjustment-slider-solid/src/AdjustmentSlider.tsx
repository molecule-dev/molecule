/**
 * AdjustmentSlider component (React parity).
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createEffect } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AdjustmentSliderProps } from './types.js'
import { clampStep, defaultFormatter, defaultResetValue, keyboardNudge } from './utilities.js'

/**
 * AdjustmentSlider component.
 *
 * Bipolar (zero-center) adjustment slider — a labelled `<input type="range">`
 * tuned for photo-editor / DAW / animation parameter controls (brightness,
 * contrast, saturation, exposure, gain, pan, etc.).
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
 * This is the Solid counterpart of `@molecule/app-adjustment-slider-react`'s
 * `AdjustmentSlider`: the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link AdjustmentSliderProps}).
 * @returns The rendered adjustment slider.
 */
export const AdjustmentSlider: Component<AdjustmentSliderProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  let inputRef: HTMLInputElement | undefined

  /** Lower bound, with React's default. */
  const min = (): number => props.min ?? -100
  /** Upper bound, with React's default. */
  const max = (): number => props.max ?? 100
  /** Step increment, with React's default. */
  const step = (): number => props.step ?? 1
  /** Bipolar / zero-center mode, with React's default. */
  const bipolar = (): boolean => props.bipolar ?? true

  /**
   * Emits a value through `onChange`, clamped + step-snapped, and only when
   * it differs from the current controlled value (React's `emit`).
   *
   * @param next - The proposed value.
   */
  const emitValue = (next: number): void => {
    const normalized = clampStep(next, min(), max(), step())
    if (normalized !== props.value) props.onChange(normalized)
  }

  /** Resets the value: `onReset` when supplied, otherwise the default target. */
  const performReset = (): void => {
    if (props.onReset) {
      props.onReset()
      return
    }
    emitValue(defaultResetValue(min(), bipolar()))
  }

  /**
   * Handles the native `input` event: emits the typed value, then applies
   * React's controlled-input restore (the DOM value returns to the prop).
   *
   * @param event - The native input event.
   */
  const handleChange = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    emitValue(Number(element.value))
    element.value = String(props.value)
  }

  /**
   * Intercepts Shift + arrow keys and nudges by ten steps (the native range
   * input already handles plain arrows).
   *
   * @param event - The native keydown event.
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.shiftKey) return
    const delta = keyboardNudge(step(), true)
    let next: number | undefined
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = props.value + delta
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = props.value - delta
    if (next === undefined) return
    event.preventDefault()
    emitValue(next)
  }

  // React keeps a controlled range input's live value on the prop, in the DOM
  // property AND the `value` attribute (its `defaultValue`). This applies both
  // at mount and whenever the prop changes — including after the user has
  // dragged, when the attribute alone would no longer reach the property.
  createEffect(() => {
    const element = inputRef
    if (!element) return
    const text = String(props.value)
    if (element.value !== text) element.value = text
    if (element.defaultValue !== text) element.defaultValue = text
  })

  return (
    <div
      class={cm.cn(cm.stack(1), props.className)}
      data-mol-id={props.dataMolId ?? 'adjustment-slider'}
    >
      <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{props.label}</span>
        <button
          type="button"
          onClick={performReset}
          aria-label={t(
            'adjustmentSlider.reset.aria',
            { label: props.label },
            { defaultValue: 'Reset {{label}}' },
          )}
          class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)}
          data-mol-id="adjustment-slider-reset"
        >
          {props.format ? props.format(props.value) : defaultFormatter(props.unit)(props.value)}
        </button>
      </div>
      <div style={{ position: 'relative' }}>
        {bipolar() && min() < 0 && max() > 0 && (
          <span
            aria-hidden="true"
            data-mol-id="adjustment-slider-center-mark"
            style={{
              position: 'absolute',
              left: `${((0 - min()) / (max() - min())) * 100}%`,
              top: '50%',
              width: '1px',
              height: '8px',
              transform: 'translate(-50%, -50%)',
              background: 'currentColor',
              opacity: '0.5',
              'pointer-events': 'none',
            }}
          />
        )}
        <input
          ref={(element) => {
            inputRef = element
          }}
          type="range"
          min={min()}
          max={max()}
          step={step()}
          onInput={handleChange}
          onKeyDown={handleKeyDown}
          onDblClick={performReset}
          aria-label={t(
            'adjustmentSlider.aria',
            { label: props.label },
            { defaultValue: '{{label}}' },
          )}
          data-mol-id="adjustment-slider-input"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
