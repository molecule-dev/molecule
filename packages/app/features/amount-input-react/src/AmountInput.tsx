import type { ChangeEvent } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { formatCurrency } from './utils.js'

/**
 *
 */
export type AmountType = 'income' | 'expense' | 'transfer' | 'other'

interface AmountInputProps {
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
  /** Currency symbol or label rendered to the left of the input. Defaults to `'$'`. */
  currencySymbol?: string
  /** Input size. */
  size?: 'md' | 'lg' | 'xl'
  /** Extra classes. */
  className?: string
}

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
 * @param root0
 * @param root0.amount
 * @param root0.onAmountChange
 * @param root0.type
 * @param root0.onTypeChange
 * @param root0.typeOptions
 * @param root0.currencySymbol
 * @param root0.size
 * @param root0.className
 */
export function AmountInput({
  amount,
  onAmountChange,
  type,
  onTypeChange,
  typeOptions = ['income', 'expense'],
  currencySymbol = '$',
  size = 'lg',
  className,
}: AmountInputProps) {
  const cm = getClassMap()
  /**
   *
   * @param e
   */
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
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
              {TYPE_LABEL[opt]}
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
          aria-label="Amount"
          className={cm.cn(fontClass, cm.fontWeight('bold'))}
          style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1 }}
        />
      </div>
    </div>
  )
}

// Re-export formatCurrency util for convenience.
export { formatCurrency }
