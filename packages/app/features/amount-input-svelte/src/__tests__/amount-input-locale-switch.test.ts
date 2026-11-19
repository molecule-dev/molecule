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
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import AmountInput from '../AmountInput.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** The mounted instance. */
let instance: ReturnType<typeof mount>

/** The host element the component rendered into. */
let host: HTMLElement

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'amountInput.type.expense': 'Expense' } },
    { code: 'fr', name: 'French', translations: { 'amountInput.type.expense': 'Dépense' } },
  ])
  setProvider(provider)
  const noop = (): void => {}
  host = document.createElement('div')
  document.body.appendChild(host)
  const props: ComponentProps<typeof AmountInput> = {
    amount: 0,
    onAmountChange: noop,
    type: 'expense',
    onTypeChange: noop,
    typeOptions: ['expense'],
  }
  instance = mount(AmountInput, { target: host, props })
  flushSync()
})

afterEach(async () => {
  await unmount(instance)
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AmountInput locale switch', () => {
  it('renders the expense toggle label in French after setLocale', async () => {
    expect(host.textContent).toContain('Expense')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Expense' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()
    expect(host.textContent).toContain('Dépense')
    expect(host.textContent).not.toContain('Expense')
  })
})
