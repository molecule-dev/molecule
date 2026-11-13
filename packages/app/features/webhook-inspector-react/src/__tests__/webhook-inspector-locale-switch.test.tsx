// @vitest-environment jsdom

/**
 * Locale-switch reactivity for WebhookInspector's retry button.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes, so
 * after `setLocale('fr')` its labels stayed in the old language until an
 * unrelated re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test
 * bonds a provider with an `en` and a `fr` value for the retry key, renders
 * a failed delivery in `en`, switches to `fr` through `act`, and asserts the
 * DOM now shows the French button label.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
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

const { WebhookInspector } = await import('../WebhookInspector.js')
import type { WebhookDelivery } from '../WebhookInspector.js'

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
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('WebhookInspector locale switch', () => {
  it('renders the retry button label in French after setLocale', async () => {
    const { container } = render(<WebhookInspector deliveries={deliveries} onRetry={() => {}} />)
    const retryButton = (): string | null =>
      container.querySelector('[data-mol-id="webhook-inspector-retry"]')?.textContent ?? null
    expect(retryButton()).toBe('Retry')

    // The switch itself: the row must re-render in French. Against the static
    // `t` this stays 'Retry' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(retryButton()).toBe('Réessayer')
  })
})
