// @vitest-environment jsdom
/**
 * The Vue `TopNavLayout`'s own text goes through i18n — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout-i18n.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom. With a provider
 * whose `t` marks every translated string, the nav region's `aria-label`
 * renders under its key — a plain-English prop default would bypass `t()` —
 * and an explicit `navAriaLabel` prop still overrides it.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `topNavLayoutRoot`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => {
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
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    getClassMap: () => new Proxy({}, handler),
  }
})

// The router markers the React tests mock `react-router` with, plus a
// translation function that marks every key, so a default that bypassed `t()`
// would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { computed, defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
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
    useLocation: () => computed(() => ({ pathname: '/', search: '', hash: '' })),
    useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { TopNavLayout } from '../TopNavLayout.js'
import type { TopNavLayoutProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TopNavLayout} and returns the markup it produced. */
const render = (props: TopNavLayoutProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TopNavLayout, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

describe('TopNavLayout i18n', () => {
  it('labels the nav region through t with its key', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup).toContain('aria-label="«topNavLayout.aria.primaryNavigation»"')
    expect(markup).not.toContain('aria-label="Primary navigation"')
  })

  it('an explicit navAriaLabel prop overrides the translated default', () => {
    const markup = render({ appName: 'Acme', navItems, navAriaLabel: 'Top nav' })
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).not.toContain('«topNavLayout.aria.primaryNavigation»')
  })
})
