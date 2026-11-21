// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `TypingIndicator`'s aria-label — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-locale-switch.test.tsx`:
 * the same test name and assertion. The label used to be a prop destructure
 * default (`ariaLabel = 'Typing…'`), which no provider could ever translate or
 * re-render. It now flows through `useTranslation()` from `@molecule/app-svelte`
 * and is read in the template, so the label re-renders on a locale switch.
 * This test bonds a provider with an `en` and a `de` value for the key, renders
 * in `en`, switches to `de`, and asserts the aria-label now shows the German
 * value.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import TypingIndicator from '../TypingIndicator.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted instance, torn down after each test. */
let instance: ReturnType<typeof mount> | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'typingIndicator.aria.label': 'Typing…' } },
    {
      code: 'de',
      name: 'German',
      translations: { 'typingIndicator.aria.label': 'Tippt gerade…' },
    },
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

describe('TypingIndicator locale switch', () => {
  it('the aria-label follows a locale switch', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(TypingIndicator, { target, props: {} })
    flushSync()
    const status = target.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Typing…')

    // The switch itself: the label must re-render in German. Against the old
    // destructure default this stayed 'Typing…' — nothing read the provider.
    await provider.setLocale('de')
    flushSync()

    expect(status?.getAttribute('aria-label')).toBe('Tippt gerade…')
  })
})
