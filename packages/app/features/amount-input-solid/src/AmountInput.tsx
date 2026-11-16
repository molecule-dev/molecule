/**
 * Solid large currency input with an optional income/expense toggle.
 *
 * Solid counterpart of `@molecule/app-amount-input-react`'s `AmountInput` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, createEffect, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { AmountInputProps, AmountType } from './types.js'
import { formatCurrency } from './utils.js'

/**
 * The text a controlled input shows for an amount, as React renders it
 * (`amount === '' ? '' : String(amount)`).
 *
 * @param amount - The current amount.
 * @returns The input's text.
 */
const amountText = (amount: number | ''): string => (amount === '' ? '' : String(amount))

/**
 * Large transaction-style amount input with optional type toggle + currency
 * symbol. Common in budgeting, expense-reporting and financial-form UX.
 *
 * The input's value follows the `amount` prop through both the live property
 * and the `value` attribute, exactly as react-dom writes a controlled input.
 *
 * @param props - Component props (see {@link AmountInputProps}).
 * @returns The rendered amount input.
 */
export const AmountInput: Component<AmountInputProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  let inputEl: HTMLInputElement | undefined

  /**
   * The type options the toggle renders (React's default parameter read at
   * render time).
   *
   * @returns The type options.
   */
  const options = (): AmountType[] => props.typeOptions ?? ['income', 'expense']

  /**
   * The resolved input size (React's default parameter read at render time).
   *
   * @returns The size.
   */
  const resolvedSize = (): 'md' | 'lg' | 'xl' => props.size ?? 'lg'

  /**
   * The size token React picks for the current size.
   *
   * @returns The font-size class.
   */
  const fontClass = (): string =>
    resolvedSize() === 'xl'
      ? cm.textSize('5xl')
      : resolvedSize() === 'lg'
        ? cm.textSize('4xl')
        : cm.textSize('2xl')

  /**
   * The input's inline style, as React writes it. A function (not a literal)
   * so Solid's runtime applies it through the CSSOM; the compiler would
   * otherwise freeze a static style object into an attribute string, which
   * serializes differently from React's.
   *
   * @returns The style object.
   */
  const inputStyle = (): Record<string, string | number> => ({
    border: 'none',
    outline: 'none',
    background: 'transparent',
    flex: 1,
  })

  /**
   * The translated label for one amount type. Each type goes to its own
   * literal key — `amountInput.type.<value>` — so the i18n parity gate can
   * see every key this component can request.
   *
   * @param option - The amount type.
   * @returns The label text.
   */
  const typeLabel = (option: AmountType): string => {
    switch (option) {
      case 'income':
        return t('amountInput.type.income', undefined, { defaultValue: 'Income' })
      case 'expense':
        return t('amountInput.type.expense', undefined, { defaultValue: 'Expense' })
      case 'transfer':
        return t('amountInput.type.transfer', undefined, { defaultValue: 'Transfer' })
      case 'other':
        return t('amountInput.type.other', undefined, { defaultValue: 'Other' })
    }
  }

  /**
   * One toggle button's label (prop > `t()` > English default).
   *
   * @param option - The amount type.
   * @returns The label text.
   */
  const labelFor = (option: AmountType): string => props.typeLabels?.[option] ?? typeLabel(option)

  /**
   * The numeric input's accessible name (prop > `t()` > English default).
   *
   * @returns The aria-label text.
   */
  const amountLabel = (): string =>
    props.ariaLabel ?? t('amountInput.ariaLabel', undefined, { defaultValue: 'Amount' })

  // react-dom writes a controlled value through BOTH the live property and the
  // attribute (`defaultValue`); a plain `value` binding here would write only
  // the property, leaving the attribute stale after a prop change.
  createEffect(() => {
    const text = amountText(props.amount)
    if (!inputEl) return
    if (inputEl.value !== text) inputEl.value = text
    if (inputEl.getAttribute('value') !== text) inputEl.setAttribute('value', text)
  })

  /**
   * Parses the raw field text and reports it, then restores the controlled
   * value exactly as react-dom does after an input event (the DOM value
   * follows the current `amount` prop until a parent renders a new one).
   *
   * @param event - The native input event.
   */
  function handleInput(event: Event): void {
    const input = event.target as HTMLInputElement
    const raw = input.value.replace(/[^0-9.-]/g, '')
    if (raw === '' || raw === '-') props.onAmountChange('')
    else {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) props.onAmountChange(parsed)
    }
    const text = amountText(props.amount)
    if (input.value !== text) input.value = text
    if (input.getAttribute('value') !== text) input.setAttribute('value', text)
  }

  return (
    <div class={cm.cn(cm.stack(3), props.className)}>
      <Show when={props.onTypeChange}>
        <div class={cm.flex({ align: 'center', gap: 'xs' })}>
          <For each={options()}>
            {(option) => (
              <Button
                type="button"
                variant={props.type === option ? 'solid' : 'ghost'}
                color={props.type === option ? 'primary' : undefined}
                size="sm"
                onClick={() => props.onTypeChange?.(option)}
              >
                {labelFor(option)}
              </Button>
            )}
          </For>
        </div>
      </Show>
      <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
        <span class={cm.cn(fontClass(), cm.fontWeight('bold'))}>{props.currencySymbol ?? '$'}</span>
        <input
          ref={(element) => {
            inputEl = element
          }}
          type="text"
          inputMode="decimal"
          onInput={handleInput}
          placeholder="0"
          aria-label={amountLabel()}
          class={cm.cn(fontClass(), cm.fontWeight('bold'))}
          style={inputStyle()}
        />
      </div>
    </div>
  )
}

// Re-export the currency formatter for convenience.
export { formatCurrency }
