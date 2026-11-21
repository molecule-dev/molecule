// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Solid `TypingIndicator`'s aria-label — a
 * port of `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-locale-switch.test.tsx`:
 * the same test name and assertion. The label used to be a literal fallback
 * (`props.ariaLabel ?? 'Typing…'`), which no provider could ever translate or
 * re-render. It now flows through `useTranslation()` from `@molecule/app-solid`
 * and is read inside a JSX expression, so the label re-renders on a locale
 * switch. This test bonds a provider with an `en` and a `de` value for the key,
 * renders in `en`, switches to `de`, and asserts the aria-label now shows the
 * German value.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

const { TypingIndicator } = await import('../TypingIndicator.jsx')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

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

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('TypingIndicator locale switch', () => {
  it('the aria-label follows a locale switch', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render(() => <TypingIndicator />, container)
    const status = container.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Typing…')

    // The switch itself: the label must re-render in German. Against the old
    // literal fallback this stayed 'Typing…' — nothing read the provider.
    await provider.setLocale('de')

    expect(status?.getAttribute('aria-label')).toBe('Tippt gerade…')
    dispose()
  })
})
