// @vitest-environment jsdom
/**
 * i18n tests for the Vue sidebar layout — a port of
 * `@molecule/app-sidebar-layout-react/src/__tests__/sidebar-layout-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. A provider
 * whose `t` marks every string proves a default that bypassed `t()`; a real
 * `en`/`de` provider proves the label follows a locale switch.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Vue suite uses.
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

// The router markers the Vue suite mocks, spread over the binding's real
// exports so `useTranslation` is the one the component actually uses.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof VueBinding>()
  const { computed, defineComponent, h } = await import('vue')
  return {
    ...actual,
    Link: defineComponent({
      name: 'Link',
      inheritAttrs: false,
      props: { to: { type: String, required: true }, replace: null, state: null },
      setup(props, { attrs, slots }) {
        return () => h('a', { ...attrs, href: props.to, 'data-link': '' }, slots.default?.())
      },
    }),
    RoutedView: defineComponent({
      name: 'RoutedView',
      setup: () => () => h('div', { 'data-outlet': '' }),
    }),
    useLocation: () => computed(() => ({ pathname: '/dashboard', search: '', hash: '' })),
  }
})

import { type App, createApp, defineComponent, h, nextTick } from 'vue'

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'
import type * as VueBinding from '@molecule/app-vue'

import { SidebarLayout } from '../SidebarLayout.js'
import type { SidebarLayoutProps } from '../types.js'

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

const mounted: Array<{ app: App; host: HTMLElement }> = []

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** The one plain nav item every test renders. */
const navItems = [{ to: '/dashboard', key: 'dashboard', label: 'Dashboard' }]

/** Mounts a {@link SidebarLayout} and returns its container. */
const mount = (props: SidebarLayoutProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(SidebarLayout, props) }))
  app.mount(host)
  mounted.push({ app, host })
  return host
}

describe('SidebarLayout i18n', () => {
  it('takes the nav region label through t with its key', () => {
    const markup = mount({ appName: 'Acme', navItems }).innerHTML
    expect(markup).toContain('aria-label="«en:sidebarLayout.aria.primaryNavigation»"')
  })

  it('lets an explicit navAriaLabel prop override the translated default', () => {
    const markup = mount({ appName: 'Acme', navItems, navAriaLabel: 'Nav override' }).innerHTML
    expect(markup).toContain('aria-label="Nav override"')
    expect(markup).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', async () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const host = mount({ appName: 'Acme', navItems })
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Primary navigation')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    await nextTick()
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Hauptnavigation')
  })
})
