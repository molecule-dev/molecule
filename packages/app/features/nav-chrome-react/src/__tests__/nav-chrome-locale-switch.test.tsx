// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the shells' landmark labels.
 *
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so a component reading `t` from the hook re-renders
 * on a locale switch. This test bonds a provider with an `en` and a `fr` value
 * for a key the bottom nav renders, renders it in `en`, switches to `fr`
 * through `act`, and asserts the `aria-label` now shows the French value.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { AppShellBottomNav } = await import('../AppShellBottomNav.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'navChrome.aria.bottom': 'Bottom' } },
    { code: 'fr', name: 'French', translations: { 'navChrome.aria.bottom': 'Bas' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AppShellBottomNav locale switch', () => {
  it('renders the bottom nav label in French after setLocale', async () => {
    const { container } = render(
      createElement(AppShellBottomNav, { items: [{ id: 'a', label: 'label-a' }] }),
    )
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Bottom')

    // The switch itself: the label must follow it without an unrelated re-render.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Bas')
  })
})
