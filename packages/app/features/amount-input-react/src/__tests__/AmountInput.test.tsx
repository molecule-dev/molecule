import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) => createElement('button', null, children),
}))

const { AmountInput } = await import('../AmountInput.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)
const noop = (): void => {}

afterEach(() => {
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AmountInput i18n', () => {
  it('renders the default English toggle labels via t() defaultValue', () => {
    const markup = html(
      createElement(AmountInput, {
        amount: 0,
        onAmountChange: noop,
        type: 'income',
        onTypeChange: noop,
        typeOptions: ['income', 'expense'],
      }),
    )
    expect(markup).toContain('Income')
    expect(markup).toContain('Expense')
  })

  it('renders the default English aria-label via t() defaultValue', () => {
    const markup = html(createElement(AmountInput, { amount: '', onAmountChange: noop }))
    expect(markup).toContain('aria-label="Amount"')
  })

  it('lets a locale bond override the toggle labels + aria-label', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            'amountInput.type.income': 'Ingreso',
            'amountInput.type.expense': 'Gasto',
            'amountInput.ariaLabel': 'Importe',
          },
        },
      ]),
    )
    const markup = html(
      createElement(AmountInput, {
        amount: 0,
        onAmountChange: noop,
        type: 'income',
        onTypeChange: noop,
        typeOptions: ['income', 'expense'],
      }),
    )
    expect(markup).toContain('Ingreso')
    expect(markup).toContain('Gasto')
    expect(markup).not.toContain('Income')
    expect(markup).toContain('aria-label="Importe"')
  })

  it('lets the typeLabels + ariaLabel props win over t() (prop > t() > default)', () => {
    // A locale bond is registered, yet the explicit props must still take
    // precedence — proving the prop > t() ordering, not just prop-vs-default.
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            'amountInput.type.income': 'Ingreso',
            'amountInput.ariaLabel': 'Importe',
          },
        },
      ]),
    )
    const markup = html(
      createElement(AmountInput, {
        amount: 0,
        onAmountChange: noop,
        type: 'income',
        onTypeChange: noop,
        typeOptions: ['income', 'expense'],
        typeLabels: { income: 'Money In', expense: 'Money Out' },
        ariaLabel: 'Transaction amount',
      }),
    )
    expect(markup).toContain('Money In')
    expect(markup).toContain('Money Out')
    expect(markup).not.toContain('Ingreso')
    expect(markup).toContain('aria-label="Transaction amount"')
  })
})
