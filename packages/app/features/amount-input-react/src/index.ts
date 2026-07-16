/**
 * React amount input with type toggle.
 *
 * Exports:
 * - `<AmountInput>` — large currency input with income/expense toggle.
 * - `AmountType` — `'income' | 'expense' | 'transfer' | 'other'`.
 * - `formatCurrency` — convenience re-export.
 *
 * @example
 * ```tsx
 * import { AmountInput } from '@molecule/app-amount-input-react'
 *
 * const [amount, setAmount] = useState<number | ''>(0)
 * const [type, setType] = useState<'income' | 'expense'>('expense')
 *
 * <AmountInput
 *   amount={amount}
 *   onAmountChange={setAmount}
 *   type={type}
 *   onTypeChange={(t) => setType(t as 'income' | 'expense')}
 *   currencySymbol="$"
 *   size="lg"
 * />
 * ```
 *
 * @remarks
 * The type-toggle labels ("Income" / "Expense" / "Transfer" / "Other") and
 * the input's aria-label are currently built-in English strings with no
 * override prop — for localized apps, hide the toggle (omit `onTypeChange`)
 * and render your own, or contribute the i18n fix.
 *
 * @module
 */

export * from './AmountInput.js'
