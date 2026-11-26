import type { ReactElement, ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'

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

const { TopNavLayout } = await import('../TopNavLayout.js')

/** The page the routing bond renders where the layout puts its routed view. */
const RoutedPage = (): ReactElement => createElement('div', { 'data-outlet': '' })

/**
 * Renders a layout under a memory router at `path`, with {@link RoutedPage} as the routed view.
 *
 * @param el - The layout.
 * @param path - The router's location.
 * @returns The markup.
 */
const html = (el: ReactNode, path = '/'): string =>
  renderToStaticMarkup(
    createElement(RouterProvider, {
      router: createMemoryRouter({ initialEntries: [path] }),
      routedView: RoutedPage,
      children: el,
    }),
  )

/**
 * The opening tag of the link whose accessible name is `label`.
 *
 * @param markup - The rendered markup.
 * @param label - The link's `aria-label`.
 * @returns The tag, or undefined.
 */
const linkTag = (markup: string, label: string): string | undefined =>
  markup.match(new RegExp(`<a [^>]*aria-label="${label}"[^>]*>`))?.[0]

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(markup).toMatch(/<a [^>]*href="\/"[^>]*>Acme<\/a>/)
  })

  it('renders a link per nav item with its label', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(linkTag(markup, 'Dashboard')).toContain('href="/dashboard"')
    expect(linkTag(markup, 'Reports')).toContain('href="/reports"')
    expect(markup).toContain('>Dashboard</span>')
    expect(markup).toContain('>Reports</span>')
  })

  it('marks the nav item matching the current path as aria-current', () => {
    const nested = html(
      createElement(TopNavLayout, { appName: 'Acme', navItems }),
      '/dashboard/settings',
    )
    expect(linkTag(nested, 'Dashboard')).toContain('aria-current="page"')
    expect(linkTag(nested, 'Reports')).not.toContain('aria-current')
    // A longer segment that only starts with the item's path is another page.
    const sibling = html(
      createElement(TopNavLayout, { appName: 'Acme', navItems }),
      '/dashboard-archive',
    )
    expect(linkTag(sibling, 'Dashboard')).not.toContain('aria-current')
  })

  it('renders the routed page in main when it has no children', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('<main><div data-outlet=""></div></main>')
  })

  it('renders its children instead of the routed page', () => {
    const markup = html(
      createElement(
        TopNavLayout,
        { appName: 'Acme', navItems },
        createElement('p', { 'data-page': '' }, 'Page'),
      ),
    )
    expect(markup).toContain('<main><p data-page="">Page</p></main>')
    expect(markup).not.toContain('data-outlet')
  })

  it('renders the userMenu slot', () => {
    const markup = html(
      createElement(TopNavLayout, {
        appName: 'Acme',
        navItems,
        userMenu: createElement('div', { 'data-user-menu': '' }),
      }),
    )
    expect(markup).toContain('data-user-menu=""')
  })

  it('labels the nav region and forwards className', () => {
    const markup = html(
      createElement(TopNavLayout, {
        appName: 'Acme',
        navItems,
        navAriaLabel: 'Top nav',
        className: 'tnl-cls',
      }),
    )
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).toContain('tnl-cls')
  })

  it('sets the data-mol-id on the outer wrapper', () => {
    const markup = html(
      createElement(TopNavLayout, { appName: 'Acme', navItems, dataMolId: 'tnl-x' }),
    )
    expect(markup).toContain('data-mol-id="tnl-x"')
  })
})
