// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TopNavLayout` — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `topNavLayoutRoot`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => {
  // The ClassMap members whose value is a class string (the rest are methods,
  // which the proxy answers as functions), so a token used as a class value
  // renders as it does under the bonded ClassMap.
  const tokens = new Set([
    'bgPrimaryContainer',
    'iconGlyphFont',
    'textMuted',
    'textPrimary',
    'topNavLayoutHeader',
    'topNavLayoutNavItem',
    'topNavLayoutNavItemIdle',
    'topNavLayoutNavItemLabel',
    'topNavLayoutRoot',
  ])
  return {
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
          if (tokens.has(token)) return token
          return (..._args: unknown[]) => token
        },
      }
      return new Proxy({}, handler)
    },
  }
})

// The router markers the React tests mock `react-router` with: `Link` renders
// an anchor with `data-link`, and the location is a fixed page path.
vi.mock('@molecule/app-vue', async () => {
  const { computed, defineComponent, h } = await import('vue')
  return {
    Link: defineComponent({
      name: 'Link',
      inheritAttrs: false,
      props: { to: { type: String, required: true }, replace: null, state: null },
      setup(props, { attrs, slots }) {
        return () => h('a', { ...attrs, href: props.to, 'data-link': '' }, slots.default?.())
      },
    }),
    useLocation: () => computed(() => ({ pathname: '/', search: '', hash: '' })),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { TopNavLayout } from '../TopNavLayout.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** The routed page body a caller passes as the default slot (React's `<Outlet />`). */
const routedView = (): VNodeChild => h('div', { 'data-outlet': '' })

/** Renders a {@link TopNavLayout} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TopNavLayout, props, slots) }))
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

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('Acme')
  })

  it('renders a NavLink per nav item with its label', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup.match(/<a [^>]*aria-label=/g) ?? []).toHaveLength(2)
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Reports')
  })

  it('renders the Outlet for nested routes', () => {
    const markup = render({ appName: 'Acme', navItems }, { default: () => [routedView()] })
    expect(markup).toContain('data-outlet=""')
  })

  it('renders the userMenu slot', () => {
    const markup = render({
      appName: 'Acme',
      navItems,
      userMenu: h('div', { 'data-user-menu': '' }),
    })
    expect(markup).toContain('data-user-menu=""')
  })

  it('labels the nav region and forwards className', () => {
    const markup = render({
      appName: 'Acme',
      navItems,
      navAriaLabel: 'Top nav',
      className: 'tnl-cls',
    })
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).toContain('tnl-cls')
  })

  it('sets the data-mol-id on the outer wrapper', () => {
    const markup = render({ appName: 'Acme', navItems, dataMolId: 'tnl-x' })
    expect(markup).toContain('data-mol-id="tnl-x"')
  })
})
