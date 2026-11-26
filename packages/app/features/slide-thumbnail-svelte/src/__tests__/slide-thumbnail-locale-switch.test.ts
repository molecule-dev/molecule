// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `SlideThumbnail`'s aria-label.
 *
 * The Svelte counterpart of the React package's locale-switch test: the label
 * reads `t` from the binding's `useTranslation()`, whose translation function
 * reads the provider's locale version while the markup evaluates, so the
 * rendered attribute updates on a switch. This test bonds a provider with an
 * `en` and a `fr` value for the label key, renders the thumbnail in `en`,
 * switches to `fr`, and asserts the DOM now shows the French aria-label.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

import SlideThumbnail from '../SlideThumbnail.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** The mounted instance, torn down after each test. */
let instance: ReturnType<typeof mount> | undefined

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

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('SlideThumbnail locale switch', () => {
  it('renders the slide aria-label in French after setLocale', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(SlideThumbnail, { target, props: { index: 4 } })
    flushSync()
    expect(target.querySelector('button[aria-label="Slide 4"]')).not.toBeNull()

    // The switch itself: the thumbnail must re-render in French. Against a
    // static `t` this stays 'Slide 4' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()
    expect(target.querySelector('button[aria-label="Diapositive 4"]')).not.toBeNull()
    expect(target.querySelector('button[aria-label="Slide 4"]')).toBeNull()
  })
})
