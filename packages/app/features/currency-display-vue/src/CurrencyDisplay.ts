/**
 * Vue currency display: an amount, an optional strikethrough original price and
 * a "saved X%" chip.
 *
 * Counterpart of `@molecule/app-currency-display-react`'s `CurrencyDisplay` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

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
 * The text-size token for a `size` prop (React's default is `'md'`).
 *
 * @param size - The `size` prop value.
 * @returns The ClassMap text-size token.
 */
const sizeClass = (size: CurrencyDisplayProps['size']): TextScale => SIZE_CLASS[size ?? 'md']

/**
 * The discount to render, when the original amount is above the current one
 * (React's condition: `originalAmount !== undefined && originalAmount > amount`).
 *
 * @param amount - The current amount.
 * @param originalAmount - The original amount, when given.
 * @returns The discount, or undefined when there is none.
 */
const discountOf = (amount: number, originalAmount?: number): Discount | undefined => {
  if (originalAmount === undefined || originalAmount <= amount) return undefined
  const saved = originalAmount - amount
  return {
    original: originalAmount,
    saved,
    pct: originalAmount > 0 ? Math.round((saved / originalAmount) * 100) : 0,
  }
}

/**
 * Display a monetary amount with optional original price (strikethrough)
 * and a "saved X%" chip. Uses `Intl.NumberFormat` under the hood.
 *
 * Use the `formatCurrency` / `formatCurrencyCompact` utilities directly
 * when you just need a string without rendering chrome.
 */
export const CurrencyDisplay = defineComponent({
  name: 'CurrencyDisplay',
  props: {
    amount: { type: Number, required: true },
    originalAmount: Number,
    currency: { type: String, default: 'USD' },
    locale: String,
    size: { type: String as PropType<CurrencyDisplayProps['size']>, default: 'md' },
    compact: Boolean,
    showSavings: { type: Boolean, default: true },
    savingsLabel: {
      type: Function as PropType<(saved: number, pct: number) => string>,
    },
    className: String,
  },
  setup(props): () => VNode {
    const cm = getClassMap()
    return (): VNode => {
      const fmt = props.compact ? formatCurrencyCompact : formatCurrency
      const discount = discountOf(props.amount, props.originalAmount)
      const children: VNodeChild[] = [
        h(
          'span',
          { class: cm.cn(cm.textSize(sizeClass(props.size)), cm.fontWeight('bold')) },
          fmt(props.amount, props.currency, props.locale),
        ),
      ]
      if (discount) {
        children.push(
          h(
            'span',
            {
              class: cm.cn(cm.textSize('sm')),
              style: { textDecoration: 'line-through' },
            },
            fmt(discount.original, props.currency, props.locale),
          ),
        )
        if (props.showSavings) {
          children.push(
            h(
              'span',
              { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
              props.savingsLabel
                ? props.savingsLabel(discount.saved, discount.pct)
                : `−${discount.pct}%`,
            ),
          )
        }
      }
      return h(
        'span',
        { class: cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), props.className) },
        children,
      )
    }
  },
})
