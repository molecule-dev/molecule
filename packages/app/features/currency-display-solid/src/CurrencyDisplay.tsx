import { type Component, type JSX, Show } from 'solid-js'

import { getClassMap, type TextScale } from '@molecule/app-ui'

import { formatCurrency, formatCurrencyCompact } from './formatCurrency.js'
import type { CurrencyDisplayProps } from './types.js'

/** The text-size token each React `size` value resolves to. */
const SIZE_CLASS = {
  sm: 'sm',
  md: 'base',
  lg: 'xl',
  xl: '3xl',
} as const

/** One rendered discount: the original price plus the saving it shows. */
interface Discount {
  /** The original amount in major units. */
  original: number
  /** How much was saved (`original - amount`). */
  saved: number
  /** The saving as a rounded whole percentage of the original. */
  pct: number
}

/**
 * Display a monetary amount with optional original price (strikethrough)
 * and a "saved X%" chip. Uses `Intl.NumberFormat` under the hood.
 *
 * This is the Solid counterpart of `@molecule/app-currency-display-react`'s
 * `CurrencyDisplay`: the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * Use the `formatCurrency` / `formatCurrencyCompact` utilities directly
 * when you just need a string without rendering chrome.
 *
 * @param props - Component props (see {@link CurrencyDisplayProps}).
 * @returns The rendered amount.
 */
export const CurrencyDisplay: Component<CurrencyDisplayProps> = (props) => {
  const cm = getClassMap()
  const sizeClass = (): TextScale => SIZE_CLASS[props.size ?? 'md']
  const fmt = (): typeof formatCurrency => (props.compact ? formatCurrencyCompact : formatCurrency)
  /** React's condition: an original amount above the current one. */
  const discount = (): Discount | undefined => {
    const original = props.originalAmount
    if (original === undefined || original <= props.amount) return undefined
    const saved = original - props.amount
    return {
      original,
      saved,
      pct: original > 0 ? Math.round((saved / original) * 100) : 0,
    }
  }
  const showSavings = (): boolean => props.showSavings ?? true
  return (
    <span class={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), props.className)}>
      <span class={cm.cn(cm.textSize(sizeClass()), cm.fontWeight('bold'))}>
        {fmt()(props.amount, props.currency ?? 'USD', props.locale)}
      </span>
      <Show when={discount()}>
        {(d): JSX.Element => (
          <>
            <span class={cm.cn(cm.textSize('sm'))} style={{ 'text-decoration': 'line-through' }}>
              {fmt()(d().original, props.currency ?? 'USD', props.locale)}
            </span>
            <Show when={showSavings()}>
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {props.savingsLabel ? props.savingsLabel(d().saved, d().pct) : `−${d().pct}%`}
              </span>
            </Show>
          </>
        )}
      </Show>
    </span>
  )
}
