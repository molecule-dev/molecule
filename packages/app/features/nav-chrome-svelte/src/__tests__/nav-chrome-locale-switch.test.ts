// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte nav-chrome shells' landmark labels —
 * a port of `@molecule/app-nav-chrome-react/src/__tests__/nav-chrome-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-svelte` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for a key the bottom nav renders, renders it in `en`, switches to
 * `fr`, and asserts the `aria-label` now shows the French value.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

import AppShellBottomNav from '../AppShellBottomNav.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted instance, torn down after each test. */
let instance: ReturnType<typeof mount> | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'navChrome.aria.bottom': 'Bottom' } },
    { code: 'fr', name: 'French', translations: { 'navChrome.aria.bottom': 'Bas' } },
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

describe('AppShellBottomNav locale switch', () => {
  it('renders the bottom nav label in French after setLocale', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(AppShellBottomNav, {
      target,
      props: { items: [{ id: 'a', label: 'label-a' }] } as never,
    })
    flushSync()
    expect(target.querySelector('nav')?.getAttribute('aria-label')).toBe('Bottom')

    // The switch itself: the label must follow it without an unrelated re-render.
    await provider.setLocale('fr')
    flushSync()

    expect(target.querySelector('nav')?.getAttribute('aria-label')).toBe('Bas')
  })
})
