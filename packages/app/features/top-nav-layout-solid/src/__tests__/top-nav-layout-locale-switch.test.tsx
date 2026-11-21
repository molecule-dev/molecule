// @vitest-environment jsdom
/**
 * The nav region's aria-label follows a locale switch — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-solid` subscribes the component to the bonded provider
 * through the signal its `t` reads, so after `setLocale('fr')` the label
 * re-renders in French. Against a hardcoded parameter default it stayed
 * English — the gap the conformance kit's pseudo-locale check records.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as SolidBinding from '@molecule/app-solid'

vi.mock('@molecule/app-ui', () => {
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
  return { getClassMap: () => new Proxy({}, handler) }
})

// Only the router is mocked; the real `useTranslation` primitive drives the
// switch, so the test holds the component's actual reactivity path.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof SolidBinding>()
  return {
    ...actual,
    Link: (props: { to: string; children?: JSX.Element } & Record<string, unknown>) => {
      const { to, children, ...anchor } = props
      return (
        <a {...anchor} href={to} data-link="">
          {children}
        </a>
      )
    },
    useLocation: () => () => ({ pathname: '/', search: '', hash: '' }),
  }
})

const { TopNavLayout } = await import('../TopNavLayout.jsx')

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'topNavLayout.aria.primaryNavigation': 'Primary navigation' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'topNavLayout.aria.primaryNavigation': 'Navigation principale' },
    },
  ])
  setProvider(provider)
})

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('TopNavLayout locale switch', () => {
  it("switching the provider's locale changes the nav region's aria-label", () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    disposers.push(render(() => <TopNavLayout appName="Acme" navItems={navItems} />, host))
    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Primary navigation')

    void provider.setLocale('fr')

    expect(nav?.getAttribute('aria-label')).toBe('Navigation principale')
  })
})
