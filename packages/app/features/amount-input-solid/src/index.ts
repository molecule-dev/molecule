/**
 * Solid amount input with type toggle.
 *
 * Exports:
 * - `<AmountInput>` — large currency input with income/expense toggle.
 * - `AmountType` — `'income' | 'expense' | 'transfer' | 'other'`.
 * - `formatCurrency` — convenience re-export.
 *
 * Solid counterpart of `@molecule/app-amount-input-react`: same props (React
 * names), same DOM for the same input, same i18n keys.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import { AmountInput, type AmountType } from '@molecule/app-amount-input-solid'
 *
 * export function TransactionForm() {
 *   const [amount, setAmount] = createSignal<number | ''>(0)
 *   const [type, setType] = createSignal<AmountType>('expense')
 *
 *   return (
 *     <AmountInput
 *       amount={amount()}
 *       onAmountChange={setAmount}
 *       type={type()}
 *       onTypeChange={setType}
 *       currencySymbol="$"
 *       size="lg"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * All user-facing text flows through `t()` with English `defaultValue`
 * fallbacks under the `amountInput.*` keys, so the
 * `@molecule/app-locales-amount-input` companion bond (or the host app's own
 * locale) can translate the type-toggle labels and the input's accessible
 * name. Both are also overridable per-instance without a bond: the
 * `typeLabels` prop relabels the toggle and `ariaLabel` sets the input's
 * accessible name (prop > `t()` > default). The text is read through the
 * framework binding's `useTranslation()`, so a locale switch re-renders it.
 *
 * @module
 */

export * from './AmountInput.jsx'
export * from './types.js'
