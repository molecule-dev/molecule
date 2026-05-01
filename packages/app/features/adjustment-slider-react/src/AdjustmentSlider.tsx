import type { ChangeEvent, KeyboardEvent } from 'react'
import { useCallback, useMemo, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { AdjustmentSliderProps } from './types.js'
import { clampStep, defaultFormatter, defaultResetValue, keyboardNudge } from './utilities.js'

/**
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
 * @param props - Component props.
 * @param props.label - Visible control label.
 * @param props.value - Current numeric value.
 * @param props.onChange - Called whenever the value changes.
 * @param props.min - Lower bound (default `-100`).
 * @param props.max - Upper bound (default `100`).
 * @param props.step - Step increment (default `1`).
 * @param props.bipolar - Bipolar / zero-center mode (default `true`).
 * @param props.unit - Optional unit suffix appended to the default formatter.
 * @param props.format - Optional custom value formatter.
 * @param props.onReset - Optional reset handler (overrides default reset).
 * @param props.className - Optional extra classes for the outer container.
 * @param props.dataMolId - Optional `data-mol-id` for the outer container.
 * @returns The rendered adjustment slider.
 */
export function AdjustmentSlider({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  bipolar = true,
  unit,
  format,
  onReset,
  className,
  dataMolId,
}: AdjustmentSliderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const formatter = useMemo(() => format ?? defaultFormatter(unit), [format, unit])
  const resetTarget = useMemo(() => defaultResetValue(min, bipolar), [min, bipolar])

  const emit = useCallback(
    (next: number) => {
      const normalized = clampStep(next, min, max, step)
      if (normalized !== value) onChange(normalized)
    },
    [max, min, onChange, step, value],
  )

  const performReset = useCallback(() => {
    if (onReset) {
      onReset()
      return
    }
    emit(resetTarget)
  }, [emit, onReset, resetTarget])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      emit(Number(e.target.value))
    },
    [emit],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Native <input type="range"> handles arrows already, but it ignores
      // the Shift modifier — intercept and apply our 10x nudge.
      if (!e.shiftKey) return
      const delta = keyboardNudge(step, true)
      let next: number | undefined
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = value + delta
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = value - delta
      if (next === undefined) return
      e.preventDefault()
      emit(next)
    },
    [emit, step, value],
  )

  const handleDoubleClick = useCallback(() => {
    performReset()
  }, [performReset])

  const display = formatter(value)
  const showCenterMark = bipolar && min < 0 && max > 0
  // Position center mark proportionally between min..max (0..100%).
  const centerPct = showCenterMark ? ((0 - min) / (max - min)) * 100 : 50

  const resetAria = t('adjustmentSlider.reset.aria', { label }, { defaultValue: `Reset ${label}` })
  const sliderAria = t('adjustmentSlider.aria', { label }, { defaultValue: label })

  return (
    <div className={cm.cn(cm.stack(1), className)} data-mol-id={dataMolId ?? 'adjustment-slider'}>
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
        <button
          type="button"
          onClick={performReset}
          aria-label={resetAria}
          className={cm.cn(cm.textSize('xs'))}
          data-mol-id="adjustment-slider-reset"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {display}
        </button>
      </div>
      <div style={{ position: 'relative' }}>
        {showCenterMark && (
          <span
            aria-hidden="true"
            data-mol-id="adjustment-slider-center-mark"
            style={{
              position: 'absolute',
              left: `${centerPct}%`,
              top: '50%',
              width: 1,
              height: 8,
              transform: 'translate(-50%, -50%)',
              background: 'currentColor',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
        )}
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
          aria-label={sliderAria}
          data-mol-id="adjustment-slider-input"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
