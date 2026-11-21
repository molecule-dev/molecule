// @vitest-environment jsdom
/**
 * i18n tests for the Solid sidebar layout — a port of
 * `@molecule/app-sidebar-layout-react/src/__tests__/sidebar-layout-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. A provider
 * whose `t` marks every string proves a default that bypassed `t()`; a real
 * `en`/`de` provider proves the label follows a locale switch.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SolidBinding from '@molecule/app-solid'

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

// The router markers the Solid suite mocks, spread over the binding's real
// exports so `useTranslation` is the one the component actually uses.
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
    useLocation: () => () => ({ pathname: '/dashboard', search: '', hash: '' }),
  }
})

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

const { SidebarLayout } = await import('../SidebarLayout.jsx')

/** The English values the real provider of the switch test carries. */
const EN = {
  'sidebarLayout.aria.primaryNavigation': 'Primary navigation',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'sidebarLayout.aria.primaryNavigation': 'Hauptnavigation',
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

/** The one plain nav item every test renders. */
const navItems = [{ to: '/dashboard', key: 'dashboard', label: 'Dashboard' }]

/** Renders a {@link SidebarLayout} with Solid's browser renderer. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('SidebarLayout i18n', () => {
  it('takes the nav region label through t with its key', () => {
    const markup = mount(() => <SidebarLayout appName="Acme" navItems={navItems} />).innerHTML
    expect(markup).toContain('aria-label="«en:sidebarLayout.aria.primaryNavigation»"')
  })

  it('lets an explicit navAriaLabel prop override the translated default', () => {
    const markup = mount(() => (
      <SidebarLayout appName="Acme" navItems={navItems} navAriaLabel="Nav override" />
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

    const container = mount(() => <SidebarLayout appName="Acme" navItems={navItems} />)
    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Primary navigation')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    await Promise.resolve()
    expect(nav?.getAttribute('aria-label')).toBe('Hauptnavigation')
  })
})
