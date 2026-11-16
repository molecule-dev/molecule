// @vitest-environment jsdom
/**
 * `InlineEdit`'s editor field label follows the provider's locale — a port of
 * `@molecule/app-inline-edit-react`'s `inline-edit-locale-switch.test.tsx`:
 * the same test name and assertion, rendered with Svelte in jsdom.
 *
 * `useTranslation()` reads the locale version through a store, so markup that
 * calls `t` re-runs on a locale switch. This test bonds a provider with an
 * `en` and a `fr` value for `inlineEdit.aria.edit`, opens the editor in `en`
 * (the key is untranslated there, so the English default shows), switches to
 * `fr`, and asserts the label is now French.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import InlineEdit from '../InlineEdit.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

const mounted: Array<ReturnType<typeof mount>> = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'fr', name: 'French', translations: { 'inlineEdit.aria.edit': 'Modifier' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InlineEdit locale switch', () => {
  it('switches the editor field label with the provider locale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const instance = mount(InlineEdit, {
      target: host,
      props: { value: 'Hello world', onSubmit: () => {} },
    })
    mounted.push(instance)
    flushSync()
    const trigger = host.querySelector('[role="button"]')
    if (!trigger) throw new Error('no read-state trigger rendered')
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Edit')

    // The switch itself: the label must follow the provider. Against the
    // hardcoded `placeholder ?? 'Edit'` fallback this stayed English.
    await provider.setLocale('fr')
    flushSync()
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Modifier')
  })
})
