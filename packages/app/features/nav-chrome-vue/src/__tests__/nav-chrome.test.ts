// @vitest-environment jsdom
/**
 * Unit tests for the Vue nav-chrome shells — a port of
 * `@molecule/app-nav-chrome-react`'s own suite: the same behavioral
 * assertions, rendered with Vue in jsdom and asserted on the markup the
 * components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Component, createApp, defineComponent, h, type VNodeChild } from 'vue'

import type { NavItem } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts a component into a detached host and returns the markup it produced. */
const render = (
  component: Component,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const nav = (id: string, over: Partial<NavItem> = {}): NavItem => ({
  id,
  label: `label-${id}`,
  ...over,
})

describe('AppShellBottomNav', () => {
  it('renders every item label', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a'), nav('b')] })
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders item icons', () => {
    const markup = render(AppShellBottomNav, {
      items: [nav('a', { icon: h('i', { 'data-icon': '' }) })],
    })
    expect(markup).toContain('data-icon=""')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a'), nav('b')], activeId: 'b' })
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables an item flagged disabled', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a', { disabled: true })] })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('labels the nav region "Bottom" and forwards className', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a')], className: 'bn-cls' })
    expect(markup).toContain('aria-label="Bottom"')
    expect(markup).toContain('bn-cls')
  })
})

describe('AppShellFooter', () => {
  it('renders the logo and copyright', () => {
    const markup = render(AppShellFooter, {
      logo: h('span', { 'data-logo': '' }),
      copyright: '© 2026 Acme',
    })
    expect(markup).toContain('data-logo=""')
    expect(markup).toContain('© 2026 Acme')
  })

  it('renders links with their hrefs, falling back to "#" when no `to`', () => {
    const markup = render(AppShellFooter, {
      links: [{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }],
    })
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Privacy')
    expect(markup).toContain('href="#"')
    expect(markup).toContain('Terms')
  })

  it('omits the footer nav when links is empty or absent', () => {
    expect(render(AppShellFooter, { links: [] })).not.toContain('aria-label="Footer"')
    expect(render(AppShellFooter, {})).not.toContain('aria-label="Footer"')
  })

  it('renders the right slot', () => {
    const markup = render(AppShellFooter, { right: h('span', { 'data-right': '' }) })
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <footer>', () => {
    const markup = render(AppShellFooter, { className: 'ft-cls' })
    expect(markup).toContain('ft-cls')
  })
})

describe('AppShellSideNav', () => {
  it('renders a flat list of items', () => {
    const markup = render(AppShellSideNav, { items: [nav('a'), nav('b')] })
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders grouped items with their headings', () => {
    const markup = render(AppShellSideNav, {
      groups: [
        { id: 'g1', heading: 'Main', items: [nav('a')] },
        { id: 'g2', heading: 'Settings', items: [nav('b')] },
      ],
    })
    expect(markup).toContain('Main')
    expect(markup).toContain('Settings')
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = render(AppShellSideNav, { items: [nav('a'), nav('b')], activeId: 'a' })
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = render(AppShellSideNav, {
      items: [nav('a', { badge: h('span', { 'data-badge': '' }) })],
    })
    expect(markup).toContain('data-badge=""')
  })

  it('renders the header and footer slots', () => {
    const markup = render(AppShellSideNav, {
      items: [nav('a')],
      header: h('div', { 'data-header': '' }),
      footer: h('div', { 'data-footer': '' }),
    })
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('labels the nav region "Sidebar" and forwards className', () => {
    const markup = render(AppShellSideNav, { items: [nav('a')], className: 'sn-cls' })
    expect(markup).toContain('aria-label="Sidebar"')
    expect(markup).toContain('sn-cls')
  })
})

describe('AppShellTopNav', () => {
  it('renders the logo', () => {
    const markup = render(AppShellTopNav, { logo: h('span', { 'data-logo': '' }) })
    expect(markup).toContain('data-logo=""')
  })

  it('renders nav items with labels', () => {
    const markup = render(AppShellTopNav, { items: [nav('a'), nav('b')] })
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('omits the centre nav when items is empty or absent', () => {
    expect(render(AppShellTopNav, { items: [] })).not.toContain('aria-label="Main"')
    expect(render(AppShellTopNav, {})).not.toContain('aria-label="Main"')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = render(AppShellTopNav, { items: [nav('a'), nav('b')], activeId: 'b' })
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = render(AppShellTopNav, {
      items: [nav('a', { badge: h('span', { 'data-badge': '' }) })],
    })
    expect(markup).toContain('data-badge=""')
  })

  it('renders the right slot', () => {
    const markup = render(AppShellTopNav, { right: h('span', { 'data-right': '' }) })
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <header>', () => {
    const markup = render(AppShellTopNav, { className: 'tn-cls' })
    expect(markup).toContain('tn-cls')
  })
})
