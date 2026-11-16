/**
 * AmountInput component (React parity).
 *
 * @module
 */

import { Component, type DoCheck, ElementRef, inject } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { AmountInputProps, AmountType } from './types.js'
import { formatCurrency } from './utils.js'

/**
 * AmountInput component.
 *
 * Large transaction-style amount input with optional type toggle + currency
 * symbol. The host IS the outer `<div>` (`div[mol-amount-input]`), matching
 * React's root exactly. Common in budgeting, expense-reporting and
 * financial-form UX.
 *
 * The numeric `<input>` carries React's controlled value: the `value`
 * attribute follows the `amount` input, and the live property is synced with
 * it, so typing snaps back to the parent's amount exactly as react-dom
 * restores a controlled input after an input event. Text is read through the
 * binding's reactive `useTranslation()`, so a locale switch re-renders it.
 */
@Component({
  selector: 'div[mol-amount-input]',
  standalone: true,
  imports: [Button],
  inputs: [
    'amount',
    'onAmountChange',
    'type',
    'onTypeChange',
    'typeOptions',
    'typeLabels',
    'currencySymbol',
    'ariaLabel',
    'size',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  template: `@if (hasTypeToggle()) {
      <div [class]="toggleClasses()">
        @for (option of typeOptionsOf(); track option) {
          <button
            mol-button
            type="button"
            [variant]="type === option ? 'solid' : 'ghost'"
            [color]="'primary'"
            [size]="'sm'"
            (click)="choose(option)"
          >
            {{ labelFor(option) }}
          </button>
        }
      </div>
    }
    <div [class]="fieldClasses()">
      <span [class]="symbolClasses()">{{ currencySymbolOf() }}</span>
      <input
        type="text"
        inputmode="decimal"
        [attr.value]="amountText()"
        (input)="handleInput($event)"
        placeholder="0"
        [attr.aria-label]="amountLabel()"
        [class]="inputClasses()"
        [style.border]="'none'"
        [style.outline]="'none'"
        [style.background]="'transparent'"
        [style.flex]="'1'"
      />
    </div>`,
})
export class AmountInput implements DoCheck {
  /** Current numeric amount (major units). */
  amount: number | '' = ''
  /** Called whenever the amount text changes (React's `onAmountChange` input). */
  onAmountChange?: AmountInputProps['onAmountChange']
  /** Optional type (income/expense/transfer) toggle. */
  type?: AmountType
  /** Called when the user changes the type (React's `onTypeChange` input). */
  onTypeChange?: AmountInputProps['onTypeChange']
  /** Type options to show in the toggle (defaults to `['income', 'expense']` at read time). */
  typeOptions?: AmountType[]
  /** Per-type label overrides, which win over `t()` (prop > `t()` > default). */
  typeLabels?: Partial<Record<AmountType, string>>
  /** Currency symbol or label rendered to the left of the input (defaults to `'$'`). */
  currencySymbol?: string
  /** Accessible label for the numeric input (prop > `t()` > default). */
  ariaLabel?: string
  /** Input size (defaults to `'lg'` at read time). */
  size?: 'md' | 'lg' | 'xl'
  /** Extra classes. */
  className?: string

  /** The host element (the outer `<div>`). */
  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale notifications, so the view re-renders the text on a locale switch
   * (the static `t` does not).
   */
  private readonly i18n = useTranslation()

  /** The amount whose value was last written to the input, so typing is not reset. */
  private syncedAmount: number | '' | undefined = undefined

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (React's `cm.cn(cm.stack(3), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * The toggle row's class (React's `cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  toggleClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The currency + input row's class (React's `cm.flex({ align: 'baseline', gap: 'xs' })`).
   * @returns The class string.
   */
  fieldClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'xs' })
  }

  /**
   * The symbol and input class list (React's `cm.cn(fontClass, cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  inputClasses(): string {
    return this.symbolClasses()
  }

  /**
   * The symbol span's class list, shared with the input.
   * @returns The class string.
   */
  symbolClasses(): string {
    return this.cm().cn(this.fontClass(), this.cm().fontWeight('bold'))
  }

  /**
   * The size token React picks for the current size.
   * @returns The font-size class.
   */
  fontClass(): string {
    const size = this.size ?? 'lg'
    return size === 'xl'
      ? this.cm().textSize('5xl')
      : size === 'lg'
        ? this.cm().textSize('4xl')
        : this.cm().textSize('2xl')
  }

  /**
   * The type options the toggle renders (React's default parameter read at render time).
   * @returns The type options.
   */
  typeOptionsOf(): AmountType[] {
    return this.typeOptions ?? ['income', 'expense']
  }

  /**
   * The currency symbol (React's default parameter read at render time).
   * @returns The symbol text.
   */
  currencySymbolOf(): string {
    return this.currencySymbol ?? '$'
  }

  /**
   * Whether the toggle renders — React's `{onTypeChange && …}`.
   * @returns True when an `onTypeChange` callback is bound.
   */
  hasTypeToggle(): boolean {
    return typeof this.onTypeChange === 'function'
  }

  /**
   * The translated label for one amount type. Each type goes to its own
   * literal key — `amountInput.type.<value>` — so the i18n parity gate can
   * see every key this component can request.
   * @param option - The amount type.
   * @returns The label text.
   */
  typeLabel(option: AmountType): string {
    switch (option) {
      case 'income':
        return this.i18n.t('amountInput.type.income', undefined, { defaultValue: 'Income' })
      case 'expense':
        return this.i18n.t('amountInput.type.expense', undefined, { defaultValue: 'Expense' })
      case 'transfer':
        return this.i18n.t('amountInput.type.transfer', undefined, { defaultValue: 'Transfer' })
      case 'other':
        return this.i18n.t('amountInput.type.other', undefined, { defaultValue: 'Other' })
    }
  }

  /**
   * One toggle button's label (prop > `t()` > English default).
   * @param option - The amount type.
   * @returns The label text.
   */
  labelFor(option: AmountType): string {
    return this.typeLabels?.[option] ?? this.typeLabel(option)
  }

  /**
   * The numeric input's accessible name (prop > `t()` > English default).
   * @returns The aria-label text.
   */
  amountLabel(): string {
    return (
      this.ariaLabel ?? this.i18n.t('amountInput.ariaLabel', undefined, { defaultValue: 'Amount' })
    )
  }

  /**
   * The text a controlled input shows for the amount (React's
   * `amount === '' ? '' : String(amount)`).
   * @returns The input's text.
   */
  amountText(): string {
    return this.amount === '' ? '' : String(this.amount)
  }

  /**
   * Calls the bound `onTypeChange` with the clicked option.
   * @param option - The clicked amount type.
   */
  choose(option: AmountType): void {
    this.onTypeChange?.(option)
  }

  /**
   * Parses the raw field text and reports it, then restores the controlled
   * value exactly as react-dom does after an input event.
   * @param event - The native input event.
   */
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement
    const raw = input.value.replace(/[^0-9.-]/g, '')
    if (raw === '' || raw === '-') this.onAmountChange?.('')
    else {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) this.onAmountChange?.(parsed)
    }
    const text = this.amountText()
    if (input.value !== text) input.value = text
    if (input.getAttribute('value') !== text) input.setAttribute('value', text)
  }

  /**
   * Writes the `amount` input's value through the live property as well as the
   * `[attr.value]` binding, and only when the amount itself changed — so text
   * the user typed is not reset on every change-detection pass.
   */
  ngDoCheck(): void {
    if (this.amount === this.syncedAmount) return
    this.syncedAmount = this.amount
    const input = (this.el.nativeElement as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement | null
    if (!input) return
    const text = this.amountText()
    if (input.value !== text) input.value = text
    if (input.getAttribute('value') !== text) input.setAttribute('value', text)
  }
}

// Re-export the currency formatter for convenience.
export { formatCurrency }
