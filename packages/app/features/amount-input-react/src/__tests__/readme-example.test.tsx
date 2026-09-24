/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AmountInput, type AmountType, formatCurrency } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered transaction form.
 */
function NewTransaction(): React.JSX.Element {
  const [amount, setAmount] = useState<number | ''>(42.5)
  const [type, setType] = useState<AmountType>('expense')
  return (
    <form>
      <AmountInput
        amount={amount}
        onAmountChange={setAmount}
        type={type}
        onTypeChange={setType}
        typeOptions={['income', 'expense', 'transfer']}
        currencySymbol="$"
        size="lg"
      />
      <output>{amount === '' ? '' : formatCurrency(amount, 'USD', 'en-US')}</output>
    </form>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the type toggle, currency prefix, amount field and formatted total', () => {
    const html = renderToStaticMarkup(<NewTransaction />)
    const buttons = [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1])
    expect(buttons).toEqual(['Income', 'Expense', 'Transfer'])
    expect(html).toContain('>$</span>')
    expect(html).toMatch(/<input[^>]*value="42.5"/)
    expect(html).toMatch(/<input[^>]*aria-label="Amount"/)
    expect(html).toContain('<output>$42.50</output>')
  })
})
