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
 * import { useState } from 'react'
 *
 * import { AmountInput, type AmountType, formatCurrency } from '@molecule/app-amount-input-react'
 *
 * export function NewTransaction() {
 *   const [amount, setAmount] = useState<number | ''>(42.5)
 *   const [type, setType] = useState<AmountType>('expense')
 *   return (
 *     <form>
 *       <AmountInput
 *         amount={amount}
 *         onAmountChange={setAmount}
 *         type={type}
 *         onTypeChange={setType}
 *         typeOptions={['income', 'expense', 'transfer']}
 *         currencySymbol="$"
 *         size="lg"
 *       />
 *       <output>{amount === '' ? '' : formatCurrency(amount, 'USD', 'en-US')}</output>
 *     </form>
 *   )
 * }
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
