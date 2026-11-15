// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Solid `AchievementCard`'s labels — a port of
 * `@molecule/app-achievement-card-react/src/__tests__/achievement-card-locale-switch.test.tsx`:
 * the same test name and assertion. A static `t` reads the bonded provider but
 * nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language.
 * `useTranslation()` from `@molecule/app-solid` subscribes to the provider, so
 * the component re-renders on the switch. This test bonds a provider with an
 * `en` and a `fr` value for a key the component renders, renders it in `en`,
 * switches to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: { children?: unknown; className?: string; style?: unknown }) => (
    <div data-card="" class={props.className} style={props.style}>
      {props.children as never}
    </div>
  ),
}))

const { AchievementCard } = await import('../AchievementCard.jsx')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'achievementCard.locked': 'Locked' } },
    { code: 'fr', name: 'French', translations: { 'achievementCard.locked': 'Verrouillé' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AchievementCard locale switch', () => {
  it('renders the locked label in French after setLocale', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render(
      () => <AchievementCard name="First Win" icon={<span>🏆</span>} />,
      container,
    )
    expect(container.textContent).toContain('Locked')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Locked' — nothing subscribed it to the provider.
    await provider.setLocale('fr')

    expect(container.textContent).toContain('Verrouillé')
    expect(container.textContent).not.toContain('Locked')
    dispose()
  })
})
