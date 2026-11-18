/**
 * AdjustmentSlider component (React parity).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { AdjustmentSliderFormatter, AdjustmentSliderProps } from './types.js'
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
 * This is the Vue counterpart of `@molecule/app-adjustment-slider-react`'s
 * `AdjustmentSlider`: the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 */
export const AdjustmentSlider = defineComponent({
  name: 'AdjustmentSlider',
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    onChange: {
      type: Function as PropType<AdjustmentSliderProps['onChange']>,
      required: true,
    },
    min: { type: Number, default: -100 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    bipolar: { type: Boolean, default: true },
    unit: String,
    format: {
      type: Function as PropType<AdjustmentSliderProps['format']>,
      default: undefined,
    },
    onReset: {
      type: Function as PropType<AdjustmentSliderProps['onReset']>,
      default: undefined,
    },
    className: String,
    dataMolId: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * Emits a value through `onChange`, clamped + step-snapped, and only when
     * it differs from the current controlled value (React's `emit`).
     *
     * @param next - The proposed value.
     */
    const emitValue = (next: number): void => {
      const normalized = clampStep(next, props.min, props.max, props.step)
      if (normalized !== props.value) props.onChange(normalized)
    }

    /** Resets the value: `onReset` when supplied, otherwise the default target. */
    const performReset = (): void => {
      if (props.onReset) {
        props.onReset()
        return
      }
      emitValue(defaultResetValue(props.min, props.bipolar))
    }

    /**
     * Handles the native `input` event: emits the typed value, then applies
     * React's controlled-input restore (the DOM value returns to the prop).
     *
     * @param event - The native input event.
     */
    const handleChange = (event: Event): void => {
      const element = event.target as HTMLInputElement
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
      const delta = keyboardNudge(props.step, true)
      let next: number | undefined
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = props.value + delta
      else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = props.value - delta
      if (next === undefined) return
      event.preventDefault()
      emitValue(next)
    }

    return (): VNode => {
      const formatter: AdjustmentSliderFormatter = props.format ?? defaultFormatter(props.unit)
      const display = formatter(props.value)
      const showCenterMark = props.bipolar && props.min < 0 && props.max > 0
      // Position center mark proportionally between min..max (0..100%).
      const centerPct = showCenterMark ? ((0 - props.min) / (props.max - props.min)) * 100 : 50

      const resetAria = t(
        'adjustmentSlider.reset.aria',
        { label: props.label },
        { defaultValue: 'Reset {{label}}' },
      )
      const sliderAria = t(
        'adjustmentSlider.aria',
        { label: props.label },
        { defaultValue: '{{label}}' },
      )

      return h(
        'div',
        {
          class: cm.cn(cm.stack(1), props.className),
          'data-mol-id': props.dataMolId ?? 'adjustment-slider',
        },
        [
          h('div', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
            h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) }, [props.label]),
            h(
              'button',
              {
                type: 'button',
                onClick: performReset,
                'aria-label': resetAria,
                class: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact),
                'data-mol-id': 'adjustment-slider-reset',
              },
              [display],
            ),
          ]),
          h('div', { style: { position: 'relative' } }, [
            showCenterMark
              ? h('span', {
                  'aria-hidden': 'true',
                  'data-mol-id': 'adjustment-slider-center-mark',
                  style: {
                    position: 'absolute',
                    left: `${centerPct}%`,
                    top: '50%',
                    width: '1px',
                    height: '8px',
                    transform: 'translate(-50%, -50%)',
                    background: 'currentColor',
                    opacity: '0.5',
                    pointerEvents: 'none',
                  },
                })
              : null,
            h('input', {
              type: 'range',
              min: props.min,
              max: props.max,
              step: props.step,
              value: String(props.value),
              defaultValue: String(props.value),
              onInput: handleChange,
              onKeydown: handleKeyDown,
              onDblclick: performReset,
              'aria-label': sliderAria,
              'data-mol-id': 'adjustment-slider-input',
              style: { width: '100%' },
            }),
          ]),
        ],
      )
    }
  },
})
