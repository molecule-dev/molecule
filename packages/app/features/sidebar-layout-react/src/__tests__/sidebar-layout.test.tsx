import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `useLocation` is hoisted so tests can vary the active pathname.
const { mockUseLocation } = vi.hoisted(() => ({ mockUseLocation: vi.fn() }))

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
  Link: ({
    to,
    children,
    ['data-mol-id']: molId,
    ['aria-current']: ariaCurrent,
  }: {
    to: string
    children?: ReactNode
    'data-mol-id'?: string
    'aria-current'?: string
  }) =>
    createElement(
      'a',
      { href: to, 'data-link': '', 'data-mol-id': molId, 'aria-current': ariaCurrent },
      children,
    ),
  Outlet: () => createElement('div', { 'data-outlet': '' }),
  useLocation: mockUseLocation,
}))

const { SidebarLayout } = await import('../SidebarLayout.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/settings', key: 'settings', label: 'Settings' },
]

describe('SidebarLayout', () => {
  beforeEach(() => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' })
  })

  it('renders the brand link with the app name', () => {
    const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('Acme')
  })

  it('renders a link per nav item with its label', () => {
    const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Settings')
    expect(markup).toContain('data-mol-id="nav-dashboard"')
    expect(markup).toContain('data-mol-id="nav-settings"')
  })

  it('marks the nav item matching the current path as aria-current', () => {
    const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the Outlet for nested routes', () => {
    const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('data-outlet=""')
  })

  it('renders the userMenu and themeToggle slots', () => {
    const markup = html(
      createElement(SidebarLayout, {
        appName: 'Acme',
        navItems,
        userMenu: createElement('div', { 'data-user-menu': '' }),
        themeToggle: createElement('div', { 'data-theme': '' }),
      }),
    )
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-theme=""')
  })

  it('labels the nav region and forwards className', () => {
    const markup = html(
      createElement(SidebarLayout, {
        appName: 'Acme',
        navItems,
        navAriaLabel: 'Main nav',
        className: 'sbl-cls',
      }),
    )
    expect(markup).toContain('aria-label="Main nav"')
    expect(markup).toContain('sbl-cls')
  })
})
