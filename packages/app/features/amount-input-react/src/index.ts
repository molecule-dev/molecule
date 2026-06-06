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
 * @module
 */

export * from './AmountInput.js'
