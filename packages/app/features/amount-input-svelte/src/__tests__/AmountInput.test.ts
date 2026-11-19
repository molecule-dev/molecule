// @vitest-environment jsdom
/**
 * Unit tests for `AmountInput`, ported from
 * `@molecule/app-amount-input-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom), the bonded ClassMap and the
 * bonded i18n provider.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import AmountInput from '../AmountInput.svelte'

const noop = (): void => {}

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts `AmountInput` with the given props and returns its host element.
 *
 * @param props - The component props.
 * @returns The host element the component rendered into.
 */
function render(props: ComponentProps<typeof AmountInput>): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(AmountInput, { target: host, props }))
  flushSync()
  return host
}

describe('AmountInput i18n', () => {
  it('renders the default English toggle labels via t() defaultValue', () => {
    const host = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(host.textContent).toContain('Income')
    expect(host.textContent).toContain('Expense')
  })

  it('renders the default English aria-label via t() defaultValue', () => {
    const host = render({ amount: '', onAmountChange: noop })
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Amount')
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
    const host = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(host.textContent).toContain('Ingreso')
    expect(host.textContent).toContain('Gasto')
    expect(host.textContent).not.toContain('Income')
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Importe')
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
    const host = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
      typeLabels: { income: 'Money In', expense: 'Money Out' },
      ariaLabel: 'Transaction amount',
    })
    expect(host.textContent).toContain('Money In')
    expect(host.textContent).toContain('Money Out')
    expect(host.textContent).not.toContain('Ingreso')
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Transaction amount')
  })

  it('passes every type option its literal key through t (marker provider)', () => {
    // A provider whose `t` returns the key it was asked for: the toggle must
    // ask `t` for each option's LITERAL key — `amountInput.type.<value>` — so
    // a locale bond can override the label; a label rendered from an inline
    // English string (or a key the bond cannot name) would never show up here.
    setProvider({ ...createSimpleI18nProvider('en'), t: (key: string) => `[${key}]` })
    const host = render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense', 'transfer', 'other'],
    })
    expect(host.textContent).toContain('[amountInput.type.income]')
    expect(host.textContent).toContain('[amountInput.type.expense]')
    expect(host.textContent).toContain('[amountInput.type.transfer]')
    expect(host.textContent).toContain('[amountInput.type.other]')
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('[amountInput.ariaLabel]')
    // The marker provider carries no translations: no English fallback may leak.
    expect(host.textContent).not.toContain('Income')
    expect(host.textContent).not.toContain('Amount')
  })
})
