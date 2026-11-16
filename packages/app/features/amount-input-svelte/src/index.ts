/**
 * Svelte amount input with type toggle.
 *
 * Exports:
 * - `<AmountInput>` — large currency input with income/expense toggle.
 * - `AmountType` — `'income' | 'expense' | 'transfer' | 'other'`.
 * - `formatCurrency` — convenience re-export.
 *
 * Svelte counterpart of `@molecule/app-amount-input-react`: same props (React
 * names), same DOM for the same input, same i18n keys.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AmountInput, type AmountType } from '@molecule/app-amount-input-svelte'
 *
 *   let amount: number | '' = $state(0)
 *   let type: AmountType = $state('expense')
 * </script>
 *
 * <AmountInput
 *   {amount}
 *   onAmountChange={(next) => (amount = next)}
 *   {type}
 *   onTypeChange={(next) => (type = next)}
 *   currencySymbol="$"
 *   size="lg"
 * />
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

export * from './components.js'
export * from './types.js'
export * from './utils.js'
