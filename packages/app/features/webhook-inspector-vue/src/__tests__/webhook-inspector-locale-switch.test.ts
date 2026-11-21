// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `WebhookInspector`'s retry button — a
 * port of
 * `@molecule/app-webhook-inspector-react/src/__tests__/webhook-inspector-locale-switch.test.tsx`:
 * the same test name and assertion. A static `t` reads the bonded provider but
 * nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language. `useTranslation()`
 * from `@molecule/app-vue` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for the retry key, renders a failed delivery in `en`, switches to `fr`,
 * and asserts the DOM now shows the French button label.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `fontWeight`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

const { WebhookInspector } = await import('../WebhookInspector.js')
import type { WebhookDelivery } from '../types.js'

/** One failed delivery — the only status that renders the retry button. */
const deliveries: WebhookDelivery[] = [
  {
    id: '1',
    eventType: 'payment.failed',
    timestamp: '10:05',
    statusCode: 500,
    status: 'failure',
  },
]

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'webhookInspector.retry': 'Retry' } },
    { code: 'fr', name: 'French', translations: { 'webhookInspector.retry': 'Réessayer' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('WebhookInspector locale switch', () => {
  it('renders the retry button label in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(WebhookInspector, { deliveries, onRetry: () => {} }) }),
    )
    app.mount(host)
    const retryButton = (): string | null =>
      host.querySelector('[data-mol-id="webhook-inspector-retry"]')?.textContent ?? null
    expect(retryButton()).toBe('Retry')

    // The switch itself: the row must re-render in French. Against the static
    // `t` this stays 'Retry' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(retryButton()).toBe('Réessayer')
  })
})
