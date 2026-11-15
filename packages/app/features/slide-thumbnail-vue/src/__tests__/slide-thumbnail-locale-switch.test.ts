// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `SlideThumbnail`'s aria-label.
 *
 * The Vue counterpart of the React package's locale-switch test: the label
 * reads `t` from the binding's `useTranslation()`, whose translation function
 * depends on the provider's locale version, so a component that renders it
 * re-renders on a switch. This test bonds a provider with an `en` and a `fr`
 * value for the label key, renders the thumbnail in `en`, switches to `fr`,
 * and asserts the DOM now shows the French aria-label.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

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

import { SlideThumbnail } from '../SlideThumbnail.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

let host: HTMLElement | undefined
let app: ReturnType<typeof createApp> | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'slideThumbnail.label': 'Slide {{index}}' } },
    {
      code: 'fr',
      name: 'French',
      translations: { 'slideThumbnail.label': 'Diapositive {{index}}' },
    },
  ])
  setProvider(provider)
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Mounts a `SlideThumbnail index={4}` into a fresh host bound to `document.body`. */
const mount = (): HTMLElement => {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(defineComponent({ render: () => h(SlideThumbnail, { index: 4 }) }))
  app.mount(host)
  return host
}

describe('SlideThumbnail locale switch', () => {
  it('renders the slide aria-label in French after setLocale', async () => {
    const container = mount()
    expect(container.querySelector('button[aria-label="Slide 4"]')).not.toBeNull()

    // The switch itself: the thumbnail must re-render in French. Against a
    // static `t` this stays 'Slide 4' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(container.querySelector('button[aria-label="Diapositive 4"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Slide 4"]')).toBeNull()
  })
})
