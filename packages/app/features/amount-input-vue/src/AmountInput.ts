/**
 * Vue large currency input with an optional income/expense toggle.
 *
 * Vue counterpart of `@molecule/app-amount-input-react`'s `AmountInput` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

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
 */
export const AmountInput = defineComponent({
  name: 'AmountInput',
  inheritAttrs: false,
  props: {
    amount: {
      type: [Number, String] as PropType<number | ''>,
      required: true,
    },
    onAmountChange: {
      type: Function as PropType<AmountInputProps['onAmountChange']>,
      default: undefined,
    },
    type: String as PropType<AmountType>,
    onTypeChange: {
      type: Function as PropType<AmountInputProps['onTypeChange']>,
      default: undefined,
    },
    typeOptions: {
      type: Array as PropType<AmountType[]>,
      default: undefined,
    },
    typeLabels: {
      type: Object as PropType<Partial<Record<AmountType, string>>>,
      default: undefined,
    },
    currencySymbol: {
      type: String,
      default: '$',
    },
    ariaLabel: String,
    size: {
      type: String as PropType<'md' | 'lg' | 'xl'>,
      default: 'lg',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * The type options the toggle renders (React's default parameter read at
     * render time).
     *
     * @returns The type options.
     */
    const options = (): AmountType[] => props.typeOptions ?? ['income', 'expense']

    /**
     * The size token React picks for the current size.
     *
     * @returns The font-size class.
     */
    const fontClass = (): string =>
      props.size === 'xl'
        ? cm.textSize('5xl')
        : props.size === 'lg'
          ? cm.textSize('4xl')
          : cm.textSize('2xl')

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
      if (raw === '' || raw === '-') props.onAmountChange?.('')
      else {
        const parsed = Number(raw)
        if (Number.isFinite(parsed)) props.onAmountChange?.(parsed)
      }
      const text = amountText(props.amount)
      if (input.value !== text) input.value = text
      if (input.getAttribute('value') !== text) input.setAttribute('value', text)
    }

    return (): VNode => {
      const children: VNodeChild[] = []

      if (props.onTypeChange) {
        const onTypeChange = props.onTypeChange
        children.push(
          h(
            'div',
            { class: cm.flex({ align: 'center', gap: 'xs' }) },
            options().map((option) =>
              h(
                Button,
                {
                  key: option,
                  type: 'button',
                  variant: props.type === option ? 'solid' : 'ghost',
                  color: props.type === option ? 'primary' : undefined,
                  size: 'sm',
                  onClick: () => onTypeChange(option),
                },
                () => [labelFor(option)],
              ),
            ),
          ),
        )
      }

      children.push(
        h('div', { class: cm.flex({ align: 'baseline', gap: 'xs' }) }, [
          h('span', { class: cm.cn(fontClass(), cm.fontWeight('bold')) }, props.currencySymbol),
          h('input', {
            type: 'text',
            inputmode: 'decimal',
            value: amountText(props.amount),
            onInput: handleInput,
            placeholder: '0',
            'aria-label': amountLabel(),
            class: cm.cn(fontClass(), cm.fontWeight('bold')),
            style: { border: 'none', outline: 'none', background: 'transparent', flex: 1 },
          }),
        ]),
      )

      return h('div', { class: cm.cn(cm.stack(3), props.className) }, children)
    }
  },
})

// Re-export the currency formatter for convenience.
export { formatCurrency }
