// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the nav label.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes.
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so a component reading `t` from the hook re-renders
 * on the switch. This test bonds a provider with an `en` and a `fr` value for
 * the key the component renders, renders it in `en`, switches to `fr` through
 * `act`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
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

const { Breadcrumb } = await import('../Breadcrumb.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'breadcrumb.aria.breadcrumb': 'Breadcrumb' } },
    { code: 'fr', name: 'French', translations: { 'breadcrumb.aria.breadcrumb': "Fil d'Ariane" } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

describe('Breadcrumb locale switch', () => {
  it('renders the nav label in French after setLocale', async () => {
    const { container } = render(<Breadcrumb items={items} />)
    const nav = () => container.querySelector('nav')!
    expect(nav().getAttribute('aria-label')).toBe('Breadcrumb')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Breadcrumb' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(nav().getAttribute('aria-label')).toBe("Fil d'Ariane")
  })
})
