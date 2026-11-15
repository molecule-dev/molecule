/**
 * CurrencyDisplay component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { TextScale, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * CurrencyDisplay component: an amount, an optional strikethrough original
 * price and a "saved X%" chip.
 *
 * The host IS React's root `<span>` (`span[mol-currency-display]`), matching
 * React's DOM exactly. Uses `Intl.NumberFormat` under the hood; the ClassMap
 * tokens come from `@molecule/app-ui`, as in React.
 */
@Component({
  selector: 'span[mol-currency-display]',
  standalone: true,
  inputs: [
    'amount',
    'originalAmount',
    'currency',
    'locale',
    'size',
    'compact',
    'showSavings',
    'savingsLabel',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  template: `
    <span [class]="amountClass()">{{ amountText() }}</span>
    @if (discount(); as d) {
      <span [class]="originalClass()" style="text-decoration: line-through">{{
        originalText(d)
      }}</span>
      @if (showSavingsOn()) {
        <span [class]="savingsClass()">{{ savingsText(d) }}</span>
      }
    }
  `,
})
export class CurrencyDisplay implements CurrencyDisplayProps {
  /** Current amount in major units. */
  amount: number = 0
  /** Optional original amount — rendered strikethrough to show a discount. */
  originalAmount?: number
  /** ISO 4217 currency code (defaults to `'USD'` at read time). */
  currency?: string
  /** Locale override. */
  locale?: string
  /** Display size (defaults to `'md'` at read time). */
  size?: CurrencyDisplayProps['size']
  /** Compact notation (`$12.3K`) instead of full. */
  compact?: boolean
  /** Show a savings chip when `originalAmount > amount` (defaults to `true`). */
  showSavings?: boolean
  /** Custom savings label renderer. */
  savingsLabel?: (saved: number, pct: number) => string
  /** Extra classes on the root span. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root span's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'baseline', gap: 'sm' }), this.className)
  }

  /**
   * The amount span's class list (text size for `size`, bold weight).
   * @returns The class string.
   */
  amountClass(): string {
    return this.cm().cn(this.cm().textSize(this.sizeToken()), this.cm().fontWeight('bold'))
  }

  /**
   * The strikethrough original price's class list.
   * @returns The class string.
   */
  originalClass(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The savings chip's class list.
   * @returns The class string.
   */
  savingsClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The text-size token for the `size` input (React's default is `'md'`).
   * @returns The ClassMap text-size token.
   */
  sizeToken(): TextScale {
    return SIZE_CLASS[this.size ?? 'md']
  }

  /**
   * The formatter for the current `compact` input.
   * @returns `formatCurrencyCompact` when compact, else `formatCurrency`.
   */
  formatter(): typeof formatCurrency {
    return this.compact ? formatCurrencyCompact : formatCurrency
  }

  /**
   * The formatted current amount.
   * @returns The formatted amount string.
   */
  amountText(): string {
    return this.formatter()(this.amount, this.currency ?? 'USD', this.locale)
  }

  /**
   * The formatted original price, when there is a discount.
   * @param discount - The rendered discount.
   * @returns The formatted original amount string.
   */
  originalText(discount: Discount): string {
    return this.formatter()(discount.original, this.currency ?? 'USD', this.locale)
  }

  /**
   * The savings chip's text: the custom label when given, else `−X%`.
   * @param discount - The rendered discount.
   * @returns The chip text.
   */
  savingsText(discount: Discount): string {
    return this.savingsLabel ? this.savingsLabel(discount.saved, discount.pct) : `−${discount.pct}%`
  }

  /**
   * Whether the savings chip renders (React's `showSavings` default is `true`).
   * @returns True when the chip is shown.
   */
  showSavingsOn(): boolean {
    return this.showSavings ?? true
  }

  /**
   * The discount to render, when the original amount is above the current one
   * (React's condition: `originalAmount !== undefined && originalAmount > amount`).
   * @returns The discount, or undefined when there is none.
   */
  discount(): Discount | undefined {
    const original = this.originalAmount
    if (original === undefined || original <= this.amount) return undefined
    const saved = original - this.amount
    return {
      original,
      saved,
      pct: original > 0 ? Math.round((saved / original) * 100) : 0,
    }
  }
}
