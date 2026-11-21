// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TopNavLayout` — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
// an anchor, and the location is a fixed page path.
vi.mock('@molecule/app-solid', () => ({
  Link: (props: { to: string; children?: JSX.Element } & Record<string, unknown>) => {
    const { to, children, ...anchor } = props
    return (
      <a {...anchor} href={to} data-link="">
        {children}
      </a>
    )
  },
  useLocation: () => () => ({ pathname: '/', search: '', hash: '' }),
  // The component's own text renders through `t`; without a bonded provider
  // the translation falls back to the call's `defaultValue`.
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }): string =>
      options?.defaultValue ?? _key,
  }),
}))

const { TopNavLayout } = await import('../TopNavLayout.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a {@link TopNavLayout} and returns the markup it produced. */
function mount(view: () => JSX.Element): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(view, host))
  return host.innerHTML
}

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('Acme')
  })

  it('renders a NavLink per nav item with its label', () => {
    const markup = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(markup.match(/<a [^>]*aria-label=/g) ?? []).toHaveLength(2)
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Reports')
  })

  it('renders the Outlet for nested routes', () => {
    const markup = mount(() => (
      <TopNavLayout appName="Acme" navItems={navItems}>
        <div data-outlet="" />
      </TopNavLayout>
    ))
    expect(markup).toContain('data-outlet=""')
  })

  it('renders the userMenu slot', () => {
    const markup = mount(() => (
      <TopNavLayout appName="Acme" navItems={navItems} userMenu={<div data-user-menu="" />} />
    ))
    expect(markup).toContain('data-user-menu=""')
  })

  it('labels the nav region and forwards className', () => {
    const markup = mount(() => (
      <TopNavLayout appName="Acme" navItems={navItems} navAriaLabel="Top nav" className="tnl-cls" />
    ))
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).toContain('tnl-cls')
  })

  it('sets the data-mol-id on the outer wrapper', () => {
    const markup = mount(() => (
      <TopNavLayout appName="Acme" navItems={navItems} dataMolId="tnl-x" />
    ))
    expect(markup).toContain('data-mol-id="tnl-x"')
  })
})
