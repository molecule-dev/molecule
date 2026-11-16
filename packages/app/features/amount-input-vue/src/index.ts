/**
 * Vue amount input with type toggle.
 *
 * Exports:
 * - `<AmountInput>` — large currency input with income/expense toggle.
 * - `AmountType` — `'income' | 'expense' | 'transfer' | 'other'`.
 * - `formatCurrency` — convenience re-export.
 *
 * Vue counterpart of `@molecule/app-amount-input-react`: same props (React
 * names), same DOM for the same input, same i18n keys.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { AmountInput } from '@molecule/app-amount-input-vue'
 * import type { AmountType } from '@molecule/app-amount-input-vue'
 *
 * const Form = defineComponent({
 *   setup() {
 *     const amount = ref<number | ''>(0)
 *     const type = ref<AmountType>('expense')
 *     return () =>
 *       h(AmountInput, {
 *         amount: amount.value,
 *         onAmountChange: (next) => (amount.value = next),
 *         type: type.value,
 *         onTypeChange: (next) => (type.value = next),
 *         currencySymbol: '$',
 *         size: 'lg',
 *       })
 *   },
 * })
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

export * from './AmountInput.js'
export * from './types.js'
