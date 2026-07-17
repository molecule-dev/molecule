import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `useLocation` is hoisted so tests can vary the active pathname.
const { mockUseLocation } = vi.hoisted(() => ({ mockUseLocation: vi.fn() }))

// The ClassMap mock echoes each accessed token as its member NAME (e.g.
// `cm.surface` → "surface", `cm.sp('p', 4)` → "sp"). That lets the tests assert
// the component routes styling through `cm.*` tokens — and, crucially, that NO
// raw Tailwind/Material-3 utility string is hardcoded (a hardcoded class would
// appear verbatim in the markup instead of as a token name).
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
    className,
    ['data-mol-id']: molId,
    ['aria-current']: ariaCurrent,
  }: {
    to: string
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
    'aria-current'?: string
  }) =>
    createElement(
      'a',
      {
        href: to,
        'data-link': '',
        className,
        'data-mol-id': molId,
        'aria-current': ariaCurrent,
      },
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

  describe('ClassMap tokens (styling-agnostic)', () => {
    it('routes the shell / surfaces / borders through cm.* tokens', () => {
      const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
      // Outer shell + page background/text (emitted together by cm.cn).
      expect(markup).toContain('pageShell page')
      // Aside surface + right border.
      expect(markup).toContain('surface borderR')
      // Bottom slot divider (top border) via cm token, when a slot is present.
      const withSlot = html(
        createElement(SidebarLayout, {
          appName: 'Acme',
          navItems,
          userMenu: createElement('div', { 'data-user-menu': '' }),
        }),
      )
      expect(withSlot).toContain('borderT')
      // Main content area token.
      expect(markup).toContain('pageShellContent')
    })

    it('styles the active vs inactive nav item with real theme tokens', () => {
      const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
      // Active item (dashboard, current path): subtle primary bg + primary text.
      expect(markup).toContain('bgPrimarySubtle textPrimary')
      // Inactive items: muted text + link hover affordance.
      expect(markup).toContain('textMuted link')
      // Pill radius token applied to nav items.
      expect(markup).toContain('roundedFull')
    })

    it('does NOT hardcode any raw Tailwind / Material-3 utility class', () => {
      const markup = html(
        createElement(SidebarLayout, {
          appName: 'Acme',
          navItems,
          userMenu: createElement('div', { 'data-user-menu': '' }),
        }),
      )
      for (const raw of [
        'bg-primary-container',
        'text-on-primary-container',
        'bg-surface-container',
        'hover:bg-surface-container',
        'hover:text-on-surface',
        'border-outline-variant',
        'bg-background',
        'text-on-surface',
        'w-60',
        'w-64',
        'rounded-md',
        'space-y-1',
        'antialiased',
        'min-w-0',
        'overflow-hidden',
        'overflow-y-auto',
      ]) {
        expect(markup).not.toContain(raw)
      }
    })

    it('keeps the documented Material Symbols icon-font exception for nav icons', () => {
      const markup = html(
        createElement(SidebarLayout, {
          appName: 'Acme',
          navItems: [{ to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: 'Dashboard' }],
        }),
      )
      expect(markup).toContain('material-symbols-outlined')
      expect(markup).toContain('>dashboard<')
    })
  })

  describe('stack-agnostic sidebar width', () => {
    it('defaults to the md preset (240px) applied via inline style, not a class', () => {
      const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
      expect(markup).toContain('width:240px')
    })

    it('maps sidebarWidth presets to fixed pixel widths', () => {
      expect(
        html(createElement(SidebarLayout, { appName: 'A', navItems, sidebarWidth: 'sm' })),
      ).toContain('width:208px')
      expect(
        html(createElement(SidebarLayout, { appName: 'A', navItems, sidebarWidth: 'md' })),
      ).toContain('width:240px')
      expect(
        html(createElement(SidebarLayout, { appName: 'A', navItems, sidebarWidth: 'lg' })),
      ).toContain('width:256px')
    })

    it('accepts an explicit pixel number', () => {
      const markup = html(
        createElement(SidebarLayout, { appName: 'A', navItems, sidebarWidth: 300 }),
      )
      expect(markup).toContain('width:300px')
    })

    it('parses the deprecated sidebarWidthClass to pixels without emitting the class', () => {
      const markup = html(
        createElement(SidebarLayout, { appName: 'A', navItems, sidebarWidthClass: 'w-64' }),
      )
      expect(markup).toContain('width:256px') // 64 * 4px
      // The legacy Tailwind class is parsed, never re-emitted (no coupling).
      expect(markup).not.toContain('w-64')
    })

    it('lets sidebarWidth take precedence over the deprecated sidebarWidthClass', () => {
      const markup = html(
        createElement(SidebarLayout, {
          appName: 'A',
          navItems,
          sidebarWidth: 'sm',
          sidebarWidthClass: 'w-64',
        }),
      )
      expect(markup).toContain('width:208px')
      expect(markup).not.toContain('width:256px')
    })

    it('gives the main content area minWidth:0 so it can shrink in the flex row', () => {
      const markup = html(createElement(SidebarLayout, { appName: 'Acme', navItems }))
      expect(markup).toContain('min-width:0')
    })
  })
})
