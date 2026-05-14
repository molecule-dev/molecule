import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
  NavLink: ({
    to,
    children,
    className,
  }: {
    to: string
    children?: ReactNode
    className?: string | ((s: { isActive: boolean }) => string)
  }) =>
    createElement(
      'a',
      {
        href: to,
        'data-navlink': '',
        className: typeof className === 'function' ? className({ isActive: false }) : className,
      },
      children,
    ),
  Outlet: () => createElement('div', { 'data-outlet': '' }),
}))

const { TopNavLayout } = await import('../TopNavLayout.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('Acme')
  })

  it('renders a NavLink per nav item with its label', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(markup.match(/data-navlink=""/g) ?? []).toHaveLength(2)
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Reports')
  })

  it('renders the Outlet for nested routes', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('data-outlet=""')
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
