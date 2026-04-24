import { getClassMap } from '@molecule/app-ui'

import { formatCurrency, formatCurrencyCompact } from './formatCurrency.js'

interface CurrencyDisplayProps {
  /** Current amount in major units. */
  amount: number
  /** Optional original amount — rendered strikethrough to show a discount. */
  originalAmount?: number
  /** ISO 4217 currency code. */
  currency?: string
  /** Locale override. */
  locale?: string
  /** Display size. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Compact notation (`$12.3K`) instead of full. */
  compact?: boolean
  /** Show a savings chip when `originalAmount > amount`. */
  showSavings?: boolean
  /** Custom savings label renderer. */
  savingsLabel?: (saved: number, pct: number) => string
  /** Extra classes. */
  className?: string
}

const SIZE_CLASS = {
  sm: 'sm',
  md: 'base',
  lg: 'xl',
  xl: '3xl',
} as const

/**
 * Display a monetary amount with optional original price (strikethrough)
 * and a "saved X%" chip. Uses `Intl.NumberFormat` under the hood.
 *
 * Use the `formatCurrency` / `formatCurrencyCompact` utilities directly
 * when you just need a string without rendering chrome.
 * @param root0
 * @param root0.amount
 * @param root0.originalAmount
 * @param root0.currency
 * @param root0.locale
 * @param root0.size
 * @param root0.compact
 * @param root0.showSavings
 * @param root0.savingsLabel
 * @param root0.className
 */
export function CurrencyDisplay({
  amount,
  originalAmount,
  currency = 'USD',
  locale,
  size = 'md',
  compact,
  showSavings = true,
  savingsLabel,
  className,
}: CurrencyDisplayProps) {
  const cm = getClassMap()
  const fmt = compact ? formatCurrencyCompact : formatCurrency
  const discounted = originalAmount !== undefined && originalAmount > amount
  const saved = discounted ? originalAmount - amount : 0
  const savedPct = discounted && originalAmount > 0 ? Math.round((saved / originalAmount) * 100) : 0
  return (
    <span className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), className)}>
      <span className={cm.cn(cm.textSize(SIZE_CLASS[size]), cm.fontWeight('bold'))}>
        {fmt(amount, currency, locale)}
      </span>
      {discounted && (
        <>
          <span className={cm.cn(cm.textSize('sm'))} style={{ textDecoration: 'line-through' }}>
            {fmt(originalAmount!, currency, locale)}
          </span>
          {showSavings && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {savingsLabel ? savingsLabel(saved, savedPct) : `−${savedPct}%`}
            </span>
          )}
        </>
      )}
    </span>
  )
}
