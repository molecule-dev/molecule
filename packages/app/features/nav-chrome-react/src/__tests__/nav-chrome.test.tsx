import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

const { AppShellBottomNav } = await import('../AppShellBottomNav.js')
const { AppShellFooter } = await import('../AppShellFooter.js')
const { AppShellSideNav } = await import('../AppShellSideNav.js')
const { AppShellTopNav } = await import('../AppShellTopNav.js')
import type { NavItem } from '../types.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const nav = (id: string, over: Partial<NavItem> = {}): NavItem => ({
  id,
  label: `label-${id}`,
  ...over,
})

describe('AppShellBottomNav', () => {
  it('renders every item label', () => {
    const markup = html(createElement(AppShellBottomNav, { items: [nav('a'), nav('b')] }))
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders item icons', () => {
    const markup = html(
      createElement(AppShellBottomNav, {
        items: [nav('a', { icon: createElement('i', { 'data-icon': '' }) })],
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = html(
      createElement(AppShellBottomNav, { items: [nav('a'), nav('b')], activeId: 'b' }),
    )
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables an item flagged disabled', () => {
    const markup = html(createElement(AppShellBottomNav, { items: [nav('a', { disabled: true })] }))
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('labels the nav region "Bottom" and forwards className', () => {
    const markup = html(
      createElement(AppShellBottomNav, { items: [nav('a')], className: 'bn-cls' }),
    )
    expect(markup).toContain('aria-label="Bottom"')
    expect(markup).toContain('bn-cls')
  })
})

describe('AppShellFooter', () => {
  it('renders the logo and copyright', () => {
    const markup = html(
      createElement(AppShellFooter, {
        logo: createElement('span', { 'data-logo': '' }),
        copyright: '© 2026 Acme',
      }),
    )
    expect(markup).toContain('data-logo=""')
    expect(markup).toContain('© 2026 Acme')
  })

  it('renders links with their hrefs, falling back to "#" when no `to`', () => {
    const markup = html(
      createElement(AppShellFooter, {
        links: [{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }],
      }),
    )
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Privacy')
    expect(markup).toContain('href="#"')
    expect(markup).toContain('Terms')
  })

  it('omits the footer nav when links is empty or absent', () => {
    expect(html(createElement(AppShellFooter, { links: [] }))).not.toContain('aria-label="Footer"')
    expect(html(createElement(AppShellFooter, {}))).not.toContain('aria-label="Footer"')
  })

  it('renders the right slot', () => {
    const markup = html(
      createElement(AppShellFooter, { right: createElement('span', { 'data-right': '' }) }),
    )
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <footer>', () => {
    const markup = html(createElement(AppShellFooter, { className: 'ft-cls' }))
    expect(markup).toContain('ft-cls')
  })
})

describe('AppShellSideNav', () => {
  it('renders a flat list of items', () => {
    const markup = html(createElement(AppShellSideNav, { items: [nav('a'), nav('b')] }))
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders grouped items with their headings', () => {
    const markup = html(
      createElement(AppShellSideNav, {
        groups: [
          { id: 'g1', heading: 'Main', items: [nav('a')] },
          { id: 'g2', heading: 'Settings', items: [nav('b')] },
        ],
      }),
    )
    expect(markup).toContain('Main')
    expect(markup).toContain('Settings')
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = html(
      createElement(AppShellSideNav, { items: [nav('a'), nav('b')], activeId: 'a' }),
    )
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = html(
      createElement(AppShellSideNav, {
        items: [nav('a', { badge: createElement('span', { 'data-badge': '' }) })],
      }),
    )
    expect(markup).toContain('data-badge=""')
  })

  it('renders the header and footer slots', () => {
    const markup = html(
      createElement(AppShellSideNav, {
        items: [nav('a')],
        header: createElement('div', { 'data-header': '' }),
        footer: createElement('div', { 'data-footer': '' }),
      }),
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('labels the nav region "Sidebar" and forwards className', () => {
    const markup = html(createElement(AppShellSideNav, { items: [nav('a')], className: 'sn-cls' }))
    expect(markup).toContain('aria-label="Sidebar"')
    expect(markup).toContain('sn-cls')
  })
})

describe('AppShellTopNav', () => {
  it('renders the logo', () => {
    const markup = html(
      createElement(AppShellTopNav, { logo: createElement('span', { 'data-logo': '' }) }),
    )
    expect(markup).toContain('data-logo=""')
  })

  it('renders nav items with labels', () => {
    const markup = html(createElement(AppShellTopNav, { items: [nav('a'), nav('b')] }))
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('omits the centre nav when items is empty or absent', () => {
    expect(html(createElement(AppShellTopNav, { items: [] }))).not.toContain('aria-label="Main"')
    expect(html(createElement(AppShellTopNav, {}))).not.toContain('aria-label="Main"')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = html(
      createElement(AppShellTopNav, { items: [nav('a'), nav('b')], activeId: 'b' }),
    )
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = html(
      createElement(AppShellTopNav, {
        items: [nav('a', { badge: createElement('span', { 'data-badge': '' }) })],
      }),
    )
    expect(markup).toContain('data-badge=""')
  })

  it('renders the right slot', () => {
    const markup = html(
      createElement(AppShellTopNav, { right: createElement('span', { 'data-right': '' }) }),
    )
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <header>', () => {
    const markup = html(createElement(AppShellTopNav, { className: 'tn-cls' }))
    expect(markup).toContain('tn-cls')
  })
})
