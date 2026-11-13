// @vitest-environment jsdom
/**
 * Translated text follows a locale switch, however a component reads `t`, and the
 * English `defaultValue` shows for a key the locale lacks — as React's components do
 * through `useTranslation()`.
 */
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'

import Host from './conformance/Host.svelte'
import Translated from './translation/Translated.svelte'

const provider = () =>
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    {
      code: 'fr',
      name: 'Français',
      direction: 'ltr',
      translations: { greeting: 'Bonjour', farewell: 'Au revoir' },
    },
  ])

const text = (via: string): string | null | undefined =>
  document.querySelector(`[data-via="${via}"]`)?.textContent

describe('translated text in a Svelte component', () => {
  let instance: ReturnType<typeof mount> | null = null
  afterEach(async () => {
    if (instance) await unmount(instance)
    instance = null
    document.body.innerHTML = ''
  })

  it('shows the English default, then the new locale after a switch', async () => {
    const i18n = provider()
    instance = mount(Host, {
      target: document.body,
      props: { config: { i18n }, component: Translated, props: {} },
    })
    flushSync()
    expect([text('useTranslation'), text('useT'), text('createI18nStores')]).toEqual([
      'Hello',
      'Goodbye',
      'Hello',
    ])

    await i18n.setLocale('fr')
    flushSync()
    expect([text('useTranslation'), text('useT'), text('createI18nStores')]).toEqual([
      'Bonjour',
      'Au revoir',
      'Bonjour',
    ])
  })
})
