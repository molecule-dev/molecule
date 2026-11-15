/**
 * Props of the Angular `CurrencyDisplay` — the same props (React names)
 * `@molecule/app-currency-display-react` accepts.
 *
 * @module
 */

/** Props for {@link CurrencyDisplay}. */
export interface CurrencyDisplayProps {
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
