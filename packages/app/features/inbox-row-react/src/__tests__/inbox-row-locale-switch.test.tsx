// @vitest-environment jsdom

/**
 * Locale-switch reactivity for InboxRow's star aria-label.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes, so
 * after `setLocale('fr')` its labels stayed in the old language until an
 * unrelated re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test
 * bonds a provider with an `en` and a `fr` value for a key the component
 * renders, renders it in `en`, switches to `fr` through `act`, and asserts
 * the DOM now shows the French value.
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

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) => (
    <img data-avatar={src ?? ''} data-avatar-name={name ?? ''} />
  ),
}))

const { InboxRow } = await import('../InboxRow.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'inboxRow.star': 'Star' } },
    { code: 'fr', name: 'French', translations: { 'inboxRow.star': 'Favori' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InboxRow locale switch', () => {
  it('renders the star aria-label in French after setLocale', async () => {
    const { container } = render(
      <InboxRow sender="Alice" subject="Lunch?" onToggleStar={() => {}} />,
    )
    expect(container.querySelector('button[aria-label="Star"]')).not.toBeNull()

    // The switch itself: the row must re-render in French. Against the static
    // `t` this stays 'Star' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('button[aria-label="Favori"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Star"]')).toBeNull()
  })
})
