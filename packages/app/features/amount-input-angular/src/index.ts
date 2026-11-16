/**
 * Angular amount input with type toggle.
 *
 * Exports:
 * - `<AmountInput>` — large currency input with income/expense toggle.
 * - `AmountType` — `'income' | 'expense' | 'transfer' | 'other'`.
 * - `formatCurrency` — convenience re-export.
 *
 * Angular counterpart of `@molecule/app-amount-input-react`: same props (React
 * names), same DOM for the same input, same i18n keys. The host element is the
 * outer `<div>`, so the selector is an attribute on a `div`
 * (`div[mol-amount-input]`), matching React's root exactly.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { AmountInput, type AmountType } from '@molecule/app-amount-input-angular'
 *
 * @Component({
 *   selector: 'app-transaction-form',
 *   standalone: true,
 *   imports: [AmountInput],
 *   template: `
 *     <div
 *       mol-amount-input
 *       [amount]="amount()"
 *       [onAmountChange]="setAmount"
 *       [type]="type()"
 *       [onTypeChange]="setType"
 *       currencySymbol="$"
 *       size="lg"
 *     ></div>
 *   `,
 * })
 * export class TransactionForm {
 *   readonly amount = signal<number | ''>(0)
 *   readonly type = signal<AmountType>('expense')
 *   readonly setAmount = (next: number | ''): void => this.amount.set(next)
 *   readonly setType = (next: AmountType): void => this.type.set(next)
 * }
 * ```
 *
 * @remarks
 * All user-facing text flows through `t()` with English `defaultValue`
 * fallbacks under the `amountInput.*` keys, so the
 * `@molecule/app-locales-amount-input` companion bond (or the host app's own
 * locale) can translate the type-toggle labels and the input's accessible
 * name. Both are also overridable per-instance without a bond: the
 * `typeLabels` input relabels the toggle and `ariaLabel` sets the input's
 * accessible name (prop > `t()` > default). The text is read through the
 * binding's reactive `useTranslation()`, so a locale switch re-renders it.
 *
 * @module
 */

export * from './amount-input.component.js'
export * from './types.js'
