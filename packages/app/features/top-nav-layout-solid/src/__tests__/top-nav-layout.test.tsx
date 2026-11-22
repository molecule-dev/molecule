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

// The current location the `useLocation` fake reads, so a test can move the
// active path before it renders.
const locationState = vi.hoisted(() => ({ pathname: '/' }))

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

// The router markers: `Link` renders an anchor, `RoutedView` renders the
// routed page, and the location is the current {@link locationState}.
vi.mock('@molecule/app-solid', () => ({
  Link: (props: { to: string; children?: JSX.Element } & Record<string, unknown>) => {
    const { to, children, ...anchor } = props
    return (
      <a {...anchor} href={to} data-link="">
        {children}
      </a>
    )
  },
  RoutedView: () => <div data-outlet="" />,
  useLocation: () => () => ({ pathname: locationState.pathname, search: '', hash: '' }),
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
  locationState.pathname = '/'
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

/**
 * The opening tag of the link whose accessible name is `label`.
 *
 * @param markup - The rendered markup.
 * @param label - The link's `aria-label`.
 * @returns The tag, or undefined.
 */
const linkTag = (markup: string, label: string): string | undefined =>
  markup.match(new RegExp(`<a [^>]*aria-label="${label}"[^>]*>`))?.[0]

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('Acme')
  })

  it('renders a link per nav item with its label', () => {
    const markup = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(markup.match(/<a [^>]*aria-label=/g) ?? []).toHaveLength(2)
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Reports')
  })

  it('marks the nav item matching the current path as aria-current', () => {
    locationState.pathname = '/dashboard/settings'
    const nested = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(linkTag(nested, 'Dashboard')).toContain('aria-current="page"')
    expect(linkTag(nested, 'Reports')).not.toContain('aria-current')
    // A longer segment that only starts with the item's path is another page.
    locationState.pathname = '/dashboard-archive'
    const sibling = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(linkTag(sibling, 'Dashboard')).not.toContain('aria-current')
  })

  it('renders the routed page in main when it has no children', () => {
    const markup = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(markup).toMatch(/<main><div data-outlet=""><\/div><\/main>/)
  })

  it('renders its children instead of the routed page', () => {
    const markup = mount(() => (
      <TopNavLayout appName="Acme" navItems={navItems}>
        <p>Page body</p>
      </TopNavLayout>
    ))
    expect(markup).toMatch(/<main><p>Page body<\/p><\/main>/)
    expect(markup).not.toContain('data-outlet')
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
