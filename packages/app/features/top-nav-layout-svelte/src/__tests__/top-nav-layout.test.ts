// @vitest-environment jsdom
/**
 * Unit tests for `TopNavLayout` — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom)
 * against mocked UI and router dependencies.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', async () => {
  const { default: Link } = await import('./LinkMock.svelte')
  const { readable } = await import('svelte/store')
  return {
    Link,
    useLocation: () => readable({ pathname: '/', search: '', hash: '' }),
    // The component's own text renders through `t`; without a bonded provider
    // the translation falls back to the call's `defaultValue`.
    useTranslation: () => ({
      t: (_key: string, _values?: unknown, options?: { defaultValue?: string }): string =>
        options?.defaultValue ?? _key,
    }),
  }
})

import type { TopNavLayoutProps } from '../types.js'

const { TopNavLayout } = await import('../components.js')

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a {@link TopNavLayout} with the given props and returns its markup. */
const render = (props: Omit<TopNavLayoutProps, 'navItems'>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(
    mount(TopNavLayout, {
      target,
      props: { navItems, ...props },
    }),
  )
  flushSync()
  return target.innerHTML
}

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('Acme')
  })

  it('renders a NavLink per nav item with its label', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup.match(/<a [^>]*aria-label=/g) ?? []).toHaveLength(2)
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Reports')
  })

  it('renders the Outlet for nested routes', () => {
    const markup = render({ appName: 'Acme', children: raw('<div data-outlet></div>') })
    expect(markup).toContain('data-outlet')
  })

  it('renders the userMenu slot', () => {
    const markup = render({ appName: 'Acme', userMenu: raw('<div data-user-menu></div>') })
    expect(markup).toContain('data-user-menu')
  })

  it('labels the nav region and forwards className', () => {
    const markup = render({ appName: 'Acme', navAriaLabel: 'Top nav', className: 'tnl-cls' })
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).toContain('tnl-cls')
  })

  it('sets the data-mol-id on the outer wrapper', () => {
    const markup = render({ appName: 'Acme', dataMolId: 'tnl-x' })
    expect(markup).toContain('data-mol-id="tnl-x"')
  })
})
