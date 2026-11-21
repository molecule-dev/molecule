/**
 * PriceRangeSlider component (React parity).
 *
 * @module
 */

import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { PriceRangeSliderProps } from './types.js'

/**
 * PriceRangeSlider component.
 *
 * Dual-handle numeric range slider using two native `<input type="range">`
 * controls. Apps supply min/max/step and a `formatValue` to render the
 * endpoint labels (typical use: currency-formatted prices). The handles clamp
 * against each other so `low <= high` always holds. This is the Solid
 * counterpart of `@molecule/app-price-range-slider-react`'s `PriceRangeSlider`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link PriceRangeSliderProps}).
 * @returns The rendered slider.
 */
export const PriceRangeSlider: Component<PriceRangeSliderProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const low = (): number => props.value[0]
  const high = (): number => props.value[1]
  /**
   * Formats an endpoint label: the caller's `formatValue`, else the USD
   * default (`$1,000`).
   *
   * @param n - The endpoint value.
   * @returns The formatted label.
   */
  const fmt = (n: number): string =>
    props.formatValue ? props.formatValue(n) : `$${n.toLocaleString()}`
  // React's range-input `onChange` fires on the native `input` event, and a
  // controlled input is restored to the prop value right after the change
  // handler returns.
  const onMinInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    props.onChange?.([Math.min(Number(element.value), high()), high()])
    element.value = String(low())
  }
  const onMaxInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    props.onChange?.([low(), Math.max(Number(element.value), low())])
    element.value = String(high())
  }

  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      {props.label && (
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.label}</span>
      )}
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <span class={cm.textSize('sm')}>{fmt(low())}</span>
        <input
          type="range"
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          attr:value={low()}
          onInput={onMinInput}
          class={cm.flex1}
          aria-label={t('priceRangeSlider.aria.minimum', undefined, { defaultValue: 'Minimum' })}
        />
        <input
          type="range"
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          attr:value={high()}
          onInput={onMaxInput}
          class={cm.flex1}
          aria-label={t('priceRangeSlider.aria.maximum', undefined, { defaultValue: 'Maximum' })}
        />
        <span class={cm.textSize('sm')}>{fmt(high())}</span>
      </div>
    </div>
  )
}
