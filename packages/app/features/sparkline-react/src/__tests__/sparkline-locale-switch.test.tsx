// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Sparkline's default aria-label. A static
 * `t` reads the bonded provider but nothing subscribes the calling component
 * to locale changes, so after `setLocale('fr')` its label stayed in the old
 * language. `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so the component re-renders on the switch. This
 * test bonds a provider with an `en` and a `fr` value for the key the
 * component renders, renders it in `en`, switches to `fr`, and asserts the
 * DOM now shows the French value.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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

const { Sparkline } = await import('../Sparkline.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted root, torn down after each test. */
let root: Root | null = null

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'sparkline.aria.trendSparkline': 'Trend sparkline' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'sparkline.aria.trendSparkline': 'Courbe de tendance' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('Sparkline locale switch', () => {
  it('renders the default aria-label in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(createElement(Sparkline, { values: [1, 2, 3] }))
    })
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe('Trend sparkline')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Trend sparkline' — nothing subscribed it to the
    // provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe('Courbe de tendance')
  })
})
