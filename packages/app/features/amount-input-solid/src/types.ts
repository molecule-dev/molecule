/**
 * Types for the Solid amount input.
 *
 * @module
 */

/** Transaction type used to categorise an amount entry. */
export type AmountType = 'income' | 'expense' | 'transfer' | 'other'

/** Props accepted by the {@link AmountInput} component. */
export interface AmountInputProps {
  /** Current numeric amount (major units). */
  amount: number | ''
  /** Called whenever the amount text changes. */
  onAmountChange: (amount: number | '') => void
  /** Optional type (income/expense/transfer) toggle. */
  type?: AmountType
  /** Called when the user changes the type. When omitted, the toggle is hidden. */
  onTypeChange?: (type: AmountType) => void
  /** Type options to show in the toggle. Defaults to `['income', 'expense']`. */
  typeOptions?: AmountType[]
  /**
   * Optional per-type label overrides. A value provided for a type wins over
   * the translated / `defaultValue` label (prop > `t()` > default), letting a
   * consumer relabel the toggle without wiring a locale bond.
   */
  typeLabels?: Partial<Record<AmountType, string>>
  /** Currency symbol or label rendered to the left of the input. Defaults to `'$'`. */
  currencySymbol?: string
  /**
   * Accessible label for the numeric input. Overrides the translated /
   * `defaultValue` `'Amount'` (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Input size. */
  size?: 'md' | 'lg' | 'xl'
  /** Extra classes. */
  className?: string
}
