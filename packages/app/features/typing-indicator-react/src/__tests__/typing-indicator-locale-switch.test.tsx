// @vitest-environment jsdom
/**
 * Locale-switch reactivity for TypingIndicator's aria-label.
 *
 * The label used to be a prop-parameter default (`ariaLabel = 'Typing…'`),
 * which no provider could ever translate or re-render. It now flows through
 * `useTranslation()` from `@molecule/app-react`, which subscribes through
 * `useSyncExternalStore`, so the label re-renders on a locale switch. This
 * test bonds a provider with an `en` and a `de` value for the key, renders in
 * `en`, switches to `de` through `act`, and asserts the aria-label now shows
 * the German value.
 *
 * @module
 */
import { act, cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the React suite uses.
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

const { TypingIndicator } = await import('../TypingIndicator.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'typingIndicator.aria.label': 'Typing…' } },
    { code: 'de', name: 'German', translations: { 'typingIndicator.aria.label': 'Tippt gerade…' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('TypingIndicator locale switch', () => {
  it('the aria-label follows a locale switch', async () => {
    const { container } = render(createElement(TypingIndicator, {}))
    const status = container.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Typing…')

    // The switch itself: the label must re-render in German. Against the old
    // parameter default this stayed 'Typing…' — nothing read the provider.
    await act(async () => {
      await provider.setLocale('de')
    })
    expect(status?.getAttribute('aria-label')).toBe('Tippt gerade…')
  })
})
