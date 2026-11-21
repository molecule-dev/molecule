// @vitest-environment jsdom

/**
 * Locale-switch reactivity for InboxRow's star aria-label — the Svelte port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row-locale-switch.test.tsx`.
 *
 * `useTranslation()` from `@molecule/app-svelte` subscribes the calling
 * component to the provider's locale notifications; its `t` reads that
 * subscription's store, so a component that translates inside a `$derived`
 * re-renders on a switch. This test bonds a provider with an `en` and a `fr`
 * value for a key the component renders, renders it in `en`, switches to `fr`,
 * and asserts the DOM now shows the French value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import InboxRow from '../InboxRow.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** What the mounted case tears down. */
let instance: ReturnType<typeof mount> | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'inboxRow.star': 'Star' } },
    { code: 'fr', name: 'French', translations: { 'inboxRow.star': 'Favori' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InboxRow locale switch', () => {
  it('renders the star aria-label in French after setLocale', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(InboxRow, {
      target,
      props: { sender: 'Alice', subject: 'Lunch?', onToggleStar: () => {} },
    })
    flushSync()
    expect(target.querySelector('button[aria-label="Star"]')).not.toBeNull()

    // The switch itself: the row must re-render in French. Against a
    // non-reactive `t` this stays 'Star' — nothing subscribed it.
    await provider.setLocale('fr')
    flushSync()
    expect(target.querySelector('button[aria-label="Favori"]')).not.toBeNull()
    expect(target.querySelector('button[aria-label="Star"]')).toBeNull()
  })
})
