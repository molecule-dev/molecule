// @vitest-environment jsdom

/**
 * Locale-switch reactivity for SlideThumbnail's aria-label.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes, so
 * after `setLocale('fr')` its labels stayed in the old language until an
 * unrelated re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test
 * bonds a provider with an `en` and a `fr` value for the label key, renders
 * the thumbnail in `en`, switches to `fr` through `act`, and asserts the DOM
 * now shows the French aria-label.
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

const { SlideThumbnail } = await import('../SlideThumbnail.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

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
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('SlideThumbnail locale switch', () => {
  it('renders the slide aria-label in French after setLocale', async () => {
    const { container } = render(<SlideThumbnail index={4} />)
    expect(container.querySelector('button[aria-label="Slide 4"]')).not.toBeNull()

    // The switch itself: the thumbnail must re-render in French. Against the
    // static `t` this stays 'Slide 4' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('button[aria-label="Diapositive 4"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Slide 4"]')).toBeNull()
  })
})
