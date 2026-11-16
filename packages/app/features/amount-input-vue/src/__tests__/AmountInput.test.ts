// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AmountInput` — a port of
 * `@molecule/app-amount-input-react/src/__tests__/AmountInput.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AmountInput } from '../AmountInput.js'
import type { AmountInputProps } from '../types.js'

const noop = (): void => {}

/** The apps mounted during one test, unmounted in `afterEach`. */
const mounted: Array<ReturnType<typeof createApp>> = []

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts an {@link AmountInput} and returns the markup it produced.
 *
 * @param props - The component props.
 * @returns The rendered markup.
 */
const render = (props: AmountInputProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      setup: () => (): VNodeChild => h(AmountInput, props),
    }),
  )
  mounted.push(app)
  app.mount(host)
  return host.innerHTML
}

describe('AmountInput i18n', () => {
  it('renders the default English toggle labels via t() defaultValue', () => {
    const markup = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(markup).toContain('Income')
    expect(markup).toContain('Expense')
  })

  it('renders the default English aria-label via t() defaultValue', () => {
    const markup = render({ amount: '', onAmountChange: noop })
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
    const markup = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
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
    const markup = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
      typeLabels: { income: 'Money In', expense: 'Money Out' },
      ariaLabel: 'Transaction amount',
    })
    expect(markup).toContain('Money In')
    expect(markup).toContain('Money Out')
    expect(markup).not.toContain('Ingreso')
    expect(markup).toContain('aria-label="Transaction amount"')
  })

  it('passes every type option its literal key through t (marker provider)', () => {
    // A provider whose `t` returns the key it was asked for: the toggle must
    // ask `t` for each option's LITERAL key — `amountInput.type.<value>` — so
    // a locale bond can override the label; a label rendered from an inline
    // English string (or a key the bond cannot name) would never show up here.
    setProvider({ ...createSimpleI18nProvider('en'), t: (key: string) => `[${key}]` })
    const markup = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense', 'transfer', 'other'],
    })
    expect(markup).toContain('[amountInput.type.income]')
    expect(markup).toContain('[amountInput.type.expense]')
    expect(markup).toContain('[amountInput.type.transfer]')
    expect(markup).toContain('[amountInput.type.other]')
    expect(markup).toContain('aria-label="[amountInput.ariaLabel]"')
    // The marker provider carries no translations: no English fallback may leak.
    expect(markup).not.toContain('Income')
    expect(markup).not.toContain('Amount')
  })
})
