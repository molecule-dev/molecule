// @vitest-environment jsdom
/**
 * Locale-switch reactivity for AmountInput's toggle labels.
 *
 * The port of `@molecule/app-amount-input-react`'s locale test: the component
 * reads `t` through the framework binding's `useTranslation()`, which
 * subscribes to the provider's locale notifications, so a `setLocale` call
 * re-renders the labels in the new language.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AmountInput } from '../AmountInput.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'amountInput.type.expense': 'Expense' } },
    { code: 'fr', name: 'French', translations: { 'amountInput.type.expense': 'Dépense' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AmountInput locale switch', () => {
  it('renders the expense toggle label in French after setLocale', async () => {
    const noop = (): void => {}
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        setup: () => (): VNodeChild =>
          h(AmountInput, {
            amount: 0,
            onAmountChange: noop,
            type: 'expense',
            onTypeChange: noop,
            typeOptions: ['expense'],
          }),
      }),
    )
    app.mount(host)
    expect(host.textContent).toContain('Expense')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Expense' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(host.textContent).toContain('Dépense')
    expect(host.textContent).not.toContain('Expense')
    app.unmount()
  })
})
