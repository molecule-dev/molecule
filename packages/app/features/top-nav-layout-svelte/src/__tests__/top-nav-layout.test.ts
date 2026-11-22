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

// The router markers: `Link` renders an anchor, the location is the current
// {@link locationState}, and `RoutedView` renders the routed page.
vi.mock('@molecule/app-svelte', async () => {
  const { default: Link } = await import('./LinkMock.svelte')
  const { default: RoutedView } = await import('./RoutedViewMock.svelte')
  const { readable } = await import('svelte/store')
  return {
    Link,
    RoutedView,
    useLocation: () => readable({ pathname: locationState.pathname, search: '', hash: '' }),
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

/**
 * The inner markup of the layout's `<main>`.
 *
 * @param markup - The rendered markup.
 * @returns The main content.
 */
const mainContent = (markup: string): string =>
  markup.match(/<main[^>]*>([\s\S]*)<\/main>/)?.[1] ?? ''

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

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
  locationState.pathname = '/'
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

  it('renders a link per nav item with its label', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup.match(/<a [^>]*aria-label=/g) ?? []).toHaveLength(2)
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Reports')
  })

  it('marks the nav item matching the current path as aria-current', () => {
    locationState.pathname = '/dashboard/settings'
    const nested = render({ appName: 'Acme' })
    expect(linkTag(nested, 'Dashboard')).toContain('aria-current="page"')
    expect(linkTag(nested, 'Reports')).not.toContain('aria-current')
    // A longer segment that only starts with the item's path is another page.
    locationState.pathname = '/dashboard-archive'
    const sibling = render({ appName: 'Acme' })
    expect(linkTag(sibling, 'Dashboard')).not.toContain('aria-current')
  })

  it('renders the routed page in main when it has no children', () => {
    const markup = render({ appName: 'Acme' })
    expect(mainContent(markup)).toContain('<div data-outlet=""></div>')
  })

  it('renders its children instead of the routed page', () => {
    const markup = render({ appName: 'Acme', children: raw('<p>Page body</p>') })
    expect(mainContent(markup)).toContain('<p>Page body</p>')
    expect(markup).not.toContain('data-outlet')
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
