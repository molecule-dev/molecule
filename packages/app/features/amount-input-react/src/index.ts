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
 * All user-facing text flows through `t()` with English `defaultValue`
 * fallbacks under the `amountInput.*` keys, so a wired locale bond (or the
 * host app's own locale) can translate the type-toggle labels and the input's
 * accessible name. Both are also overridable per-instance without a bond: the
 * `typeLabels` prop relabels the toggle and `ariaLabel` sets the input's
 * accessible name (prop > `t()` > default).
 *
 * @module
 */

export * from './AmountInput.js'
