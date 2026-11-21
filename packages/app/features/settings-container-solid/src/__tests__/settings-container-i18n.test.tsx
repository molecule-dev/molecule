// @vitest-environment jsdom
/**
 * i18n tests for the Solid settings sidebar — a port of
 * `@molecule/app-settings-container-react/src/__tests__/settings-container-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. A provider
 * whose `t` marks every string proves a default that bypassed `t()`; a real
 * `en`/`de` provider proves the label follows a locale switch.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Solid suite uses.
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

import type { JSX } from 'solid-js'

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

const { SettingsSidebar } = await import('../SettingsSidebar.jsx')

/** The English values the real provider of the switch test carries. */
const EN = {
  'settingsContainer.aria.settings': 'Settings',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'settingsContainer.aria.settings': 'Einstellungen',
}

/** The real `en`/`de` provider, set inside the switch test. */
let locales: I18nProvider

beforeEach(() => {
  // A provider whose `t` marks every string with its key, so a default that
  // bypassed t() would show up as plain English.
  setProvider({
    ...createSimpleI18nProvider('en'),
    t: (key) => `«en:${key}»`,
  })
})

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** The two plain nav items every test renders. */
const items = [
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing' },
]

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('SettingsSidebar i18n', () => {
  it('takes the nav region label through t when no ariaLabel is given', () => {
    const markup = mount(() => (
      <SettingsSidebar items={items} activeId="profile" onSelect={() => {}} />
    )).innerHTML
    expect(markup).toContain('aria-label="«en:settingsContainer.aria.settings»"')
  })

  it('lets an explicit ariaLabel prop override the translated default', () => {
    const markup = mount(() => (
      <SettingsSidebar
        items={items}
        activeId="profile"
        onSelect={() => {}}
        ariaLabel="Nav override"
      />
    )).innerHTML
    expect(markup).toContain('aria-label="Nav override"')
    expect(markup).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', async () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const container = mount(() => (
      <SettingsSidebar items={items} activeId="profile" onSelect={() => {}} />
    ))
    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Settings')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    await Promise.resolve()
    expect(nav?.getAttribute('aria-label')).toBe('Einstellungen')
  })
})
