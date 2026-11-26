// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `NpsDistribution`'s score-line label —
 * a port of
 * `@molecule/app-nps-distribution-react/src/__tests__/nps-distribution-locale-switch.test.tsx`:
 * the same test name and assertion. A static `t` reads the bonded provider but
 * nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language. `useTranslation()`
 * from `@molecule/app-vue` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for a key the component renders, renders it in `en`, switches to `fr`,
 * and asserts the DOM now shows the French value.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

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

import { NpsDistribution } from '../NpsDistribution.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'nps-distribution.score.responses': '{{total}} responses' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'nps-distribution.score.responses': '{{total}} réponses' },
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

describe('NpsDistribution locale switch', () => {
  it('renders the responses label in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(NpsDistribution, { scores: [10, 9, 0] }) }),
    )
    app.mount(host)
    expect(host.textContent).toContain('3 responses')

    // The switch itself: the chart must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()

    expect(host.textContent).toContain('3 réponses')
    expect(host.textContent).not.toContain('3 responses')
  })
})
