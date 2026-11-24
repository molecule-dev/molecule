import type { ReactElement } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, Text, TextField } from '@molecule/app-ui-react/elements'

import { formatCurrency } from './utils.js'

/** Transaction type used to categorise an amount entry. */
export type AmountType = 'income' | 'expense' | 'transfer' | 'other'

/** Props for {@link AmountInput}. */
export interface AmountInputProps {
  /** Current numeric amount (major units). */
  amount: number | ''
  /** Called whenever the amount text changes. */
  onAmountChange: (amount: number | '') => void
  /** Optional type (income/expense/transfer) toggle. */
  type?: AmountType
  /** Called when the user changes the type. When omitted, the toggle is hidden. */
  onTypeChange?: (type: AmountType) => void
  /** Type options to show in the toggle. Defaults to `['income', 'expense']`. */
  typeOptions?: AmountType[]
  /**
   * Optional per-type label overrides. A value provided for a type wins over
   * the translated / `defaultValue` label (prop > `t()` > default), letting a
   * consumer relabel the toggle without wiring a locale bond.
   */
  typeLabels?: Partial<Record<AmountType, string>>
  /** Currency symbol or label rendered to the left of the input. Defaults to `'$'`. */
  currencySymbol?: string
  /**
   * Accessible label for the numeric input. Overrides the translated /
   * `defaultValue` `'Amount'` (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Input size. */
  size?: 'md' | 'lg' | 'xl'
  /** Extra classes. */
  className?: string
}

/**
 * Large transaction-style amount input with optional type toggle +
 * currency symbol. Common in budgeting, expense-reporting, and
 * financial-form UX.
 * @param props - Component props (see {@link AmountInputProps}).
 */
export function AmountInput({
  amount,
  onAmountChange,
  type,
  onTypeChange,
  typeOptions = ['income', 'expense'],
  typeLabels,
  currencySymbol = '$',
  ariaLabel,
  size = 'lg',
  className,
}: AmountInputProps): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const amountLabel = ariaLabel ?? t('amountInput.ariaLabel', undefined, { defaultValue: 'Amount' })
  /**
   * One toggle button's label (prop > `t()` > English default). Each amount
   * type goes to its own literal key — `amountInput.type.<value>` — so the
   * i18n parity gate can see every key this component can request.
   * @param option - The amount type.
   * @returns The label text.
   */
  function typeLabel(option: AmountType): string {
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
   * Parses the field's text and fires onAmountChange with a number or empty string.
   * @param value - The field's new text.
   */
  function handleValue(value: string): void {
    const raw = value.replace(/[^0-9.-]/g, '')
    if (raw === '' || raw === '-') {
      onAmountChange('')
      return
    }
    const n = Number(raw)
    if (Number.isFinite(n)) onAmountChange(n)
  }
  const fontClass =
    size === 'xl' ? cm.textSize('5xl') : size === 'lg' ? cm.textSize('4xl') : cm.textSize('2xl')
  return (
    <Box as="div" className={cm.cn(cm.stack(3), className)}>
      {onTypeChange && (
        <Box as="div" className={cm.flex({ align: 'center', gap: 'xs' })}>
          {typeOptions.map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={type === opt ? 'solid' : 'ghost'}
              color={type === opt ? 'primary' : undefined}
              size="sm"
              onClick={() => onTypeChange(opt)}
            >
              {typeLabels?.[opt] ?? typeLabel(opt)}
            </Button>
          ))}
        </Box>
      )}
      <Box as="div" className={cm.flex({ align: 'baseline', gap: 'xs' })}>
        <Text as="span" className={cm.cn(fontClass, cm.fontWeight('bold'))}>
          {currencySymbol}
        </Text>
        <TextField
          as="input"
          type="text"
          inputMode="decimal"
          value={amount === '' ? '' : String(amount)}
          onValueChange={handleValue}
          placeholder="0"
          aria-label={amountLabel}
          className={cm.cn(fontClass, cm.fontWeight('bold'))}
          style={{ flex: 1 }}
          webStyle={{ border: 'none', outline: 'none', background: 'transparent' }}
        />
      </Box>
    </Box>
  )
}

// Re-export formatCurrency util for convenience.
export { formatCurrency }
