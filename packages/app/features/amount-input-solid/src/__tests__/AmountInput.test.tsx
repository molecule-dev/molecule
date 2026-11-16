// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AmountInput` — a port of
 * `@molecule/app-amount-input-react/src/__tests__/AmountInput.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AmountInput } from '../AmountInput.jsx'
import type { AmountInputProps } from '../types.js'

const noop = (): void => {}

/** The disposers of the roots mounted during one test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts an {@link AmountInput} and returns the element it rendered into.
 *
 * @param props - The component props.
 * @returns The mount container.
 */
const mount = (props: AmountInputProps): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <AmountInput {...props} />, container))
  return container
}

describe('AmountInput i18n', () => {
  it('renders the default English toggle labels via t() defaultValue', () => {
    const container = mount({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(container.textContent).toContain('Income')
    expect(container.textContent).toContain('Expense')
  })

  it('renders the default English aria-label via t() defaultValue', () => {
    const container = mount({ amount: '', onAmountChange: noop })
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Amount')
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
    const container = mount({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(container.textContent).toContain('Ingreso')
    expect(container.textContent).toContain('Gasto')
    expect(container.textContent).not.toContain('Income')
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Importe')
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
    const container = mount({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
      typeLabels: { income: 'Money In', expense: 'Money Out' },
      ariaLabel: 'Transaction amount',
    })
    expect(container.textContent).toContain('Money In')
    expect(container.textContent).toContain('Money Out')
    expect(container.textContent).not.toContain('Ingreso')
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Transaction amount')
  })

  it('passes every type option its literal key through t (marker provider)', () => {
    // A provider whose `t` returns the key it was asked for: the toggle must
    // ask `t` for each option's LITERAL key — `amountInput.type.<value>` — so
    // a locale bond can override the label; a label rendered from an inline
    // English string (or a key the bond cannot name) would never show up here.
    setProvider({ ...createSimpleI18nProvider('en'), t: (key: string) => `[${key}]` })
    const container = mount({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense', 'transfer', 'other'],
    })
    expect(container.textContent).toContain('[amountInput.type.income]')
    expect(container.textContent).toContain('[amountInput.type.expense]')
    expect(container.textContent).toContain('[amountInput.type.transfer]')
    expect(container.textContent).toContain('[amountInput.type.other]')
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe(
      '[amountInput.ariaLabel]',
    )
    // The marker provider carries no translations: no English fallback may leak.
    expect(container.textContent).not.toContain('Income')
    expect(container.textContent).not.toContain('Amount')
  })
})
