import type { ChangeEvent, ReactElement } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { formatCurrency } from './utils.js'

/** Transaction type used to categorise an amount entry. */
export type AmountType = 'income' | 'expense' | 'transfer' | 'other'

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

/** English fallback labels for each amount type — keyed to `amountInput.type.*`. */
const TYPE_LABEL: Record<AmountType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  other: 'Other',
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
  const cm = getClassMap()
  const amountLabel = ariaLabel ?? t('amountInput.ariaLabel', undefined, { defaultValue: 'Amount' })
  /**
   * Parses the raw input value and fires onAmountChange with a number or empty string.
   * @param e
   */
  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value.replace(/[^0-9.-]/g, '')
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
    <div className={cm.cn(cm.stack(3), className)}>
      {onTypeChange && (
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          {typeOptions.map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={type === opt ? 'solid' : 'ghost'}
              color={type === opt ? 'primary' : undefined}
              size="sm"
              onClick={() => onTypeChange(opt)}
            >
              {typeLabels?.[opt] ??
                t(`amountInput.type.${opt}`, undefined, { defaultValue: TYPE_LABEL[opt] })}
            </Button>
          ))}
        </div>
      )}
      <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
        <span className={cm.cn(fontClass, cm.fontWeight('bold'))}>{currencySymbol}</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount === '' ? '' : String(amount)}
          onChange={handleChange}
          placeholder="0"
          aria-label={amountLabel}
          className={cm.cn(fontClass, cm.fontWeight('bold'))}
          style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1 }}
        />
      </div>
    </div>
  )
}

// Re-export formatCurrency util for convenience.
export { formatCurrency }
