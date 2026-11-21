// @vitest-environment jsdom
/**
 * Unit tests for the Solid nav-chrome shells — a port of
 * `@molecule/app-nav-chrome-react`'s own suite: the same behavioral
 * assertions, rendered with Solid in jsdom and asserted on the markup the
 * components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const { AppShellBottomNav } = await import('../AppShellBottomNav.jsx')
const { AppShellFooter } = await import('../AppShellFooter.jsx')
const { AppShellSideNav } = await import('../AppShellSideNav.jsx')
const { AppShellTopNav } = await import('../AppShellTopNav.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders with Solid's browser renderer and disposes after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const nav = (id: string, over: Partial<NavItem> = {}): NavItem => ({
  id,
  label: `label-${id}`,
  ...over,
})

describe('AppShellBottomNav', () => {
  it('renders every item label', () => {
    const markup = mount(() => <AppShellBottomNav items={[nav('a'), nav('b')]} />).innerHTML
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders item icons', () => {
    const markup = mount(() => (
      <AppShellBottomNav items={[nav('a', { icon: <i data-icon="" /> })]} />
    )).innerHTML
    expect(markup).toContain('data-icon=""')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = mount(() => (
      <AppShellBottomNav items={[nav('a'), nav('b')]} activeId="b" />
    )).innerHTML
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables an item flagged disabled', () => {
    const markup = mount(() => (
      <AppShellBottomNav items={[nav('a', { disabled: true })]} />
    )).innerHTML
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('labels the nav region "Bottom" and forwards className', () => {
    const markup = mount(() => (
      <AppShellBottomNav items={[nav('a')]} className="bn-cls" />
    )).innerHTML
    expect(markup).toContain('aria-label="Bottom"')
    expect(markup).toContain('bn-cls')
  })
})

describe('AppShellFooter', () => {
  it('renders the logo and copyright', () => {
    const markup = mount(() => (
      <AppShellFooter logo={<span data-logo="" />} copyright="© 2026 Acme" />
    )).innerHTML
    expect(markup).toContain('data-logo=""')
    expect(markup).toContain('© 2026 Acme')
  })

  it('renders links with their hrefs, falling back to "#" when no `to`', () => {
    const markup = mount(() => (
      <AppShellFooter links={[{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }]} />
    )).innerHTML
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Privacy')
    expect(markup).toContain('href="#"')
    expect(markup).toContain('Terms')
  })

  it('omits the footer nav when links is empty or absent', () => {
    expect(mount(() => <AppShellFooter links={[]} />).innerHTML).not.toContain(
      'aria-label="Footer"',
    )
    expect(mount(() => <AppShellFooter />).innerHTML).not.toContain('aria-label="Footer"')
  })

  it('renders the right slot', () => {
    const markup = mount(() => <AppShellFooter right={<span data-right="" />} />).innerHTML
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <footer>', () => {
    const markup = mount(() => <AppShellFooter className="ft-cls" />).innerHTML
    expect(markup).toContain('ft-cls')
  })
})

describe('AppShellSideNav', () => {
  it('renders a flat list of items', () => {
    const markup = mount(() => <AppShellSideNav items={[nav('a'), nav('b')]} />).innerHTML
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders grouped items with their headings', () => {
    const markup = mount(() => (
      <AppShellSideNav
        groups={[
          { id: 'g1', heading: 'Main', items: [nav('a')] },
          { id: 'g2', heading: 'Settings', items: [nav('b')] },
        ]}
      />
    )).innerHTML
    expect(markup).toContain('Main')
    expect(markup).toContain('Settings')
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = mount(() => (
      <AppShellSideNav items={[nav('a'), nav('b')]} activeId="a" />
    )).innerHTML
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = mount(() => (
      <AppShellSideNav items={[nav('a', { badge: <span data-badge="" /> })]} />
    )).innerHTML
    expect(markup).toContain('data-badge=""')
  })

  it('renders the header and footer slots', () => {
    const markup = mount(() => (
      <AppShellSideNav
        items={[nav('a')]}
        header={<div data-header="" />}
        footer={<div data-footer="" />}
      />
    )).innerHTML
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('labels the nav region "Sidebar" and forwards className', () => {
    const markup = mount(() => <AppShellSideNav items={[nav('a')]} className="sn-cls" />).innerHTML
    expect(markup).toContain('aria-label="Sidebar"')
    expect(markup).toContain('sn-cls')
  })
})

describe('AppShellTopNav', () => {
  it('renders the logo', () => {
    const markup = mount(() => <AppShellTopNav logo={<span data-logo="" />} />).innerHTML
    expect(markup).toContain('data-logo=""')
  })

  it('renders nav items with labels', () => {
    const markup = mount(() => <AppShellTopNav items={[nav('a'), nav('b')]} />).innerHTML
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('omits the centre nav when items is empty or absent', () => {
    expect(mount(() => <AppShellTopNav items={[]} />).innerHTML).not.toContain('aria-label="Main"')
    expect(mount(() => <AppShellTopNav />).innerHTML).not.toContain('aria-label="Main"')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = mount(() => (
      <AppShellTopNav items={[nav('a'), nav('b')]} activeId="b" />
    )).innerHTML
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = mount(() => (
      <AppShellTopNav items={[nav('a', { badge: <span data-badge="" /> })]} />
    )).innerHTML
    expect(markup).toContain('data-badge=""')
  })

  it('renders the right slot', () => {
    const markup = mount(() => <AppShellTopNav right={<span data-right="" />} />).innerHTML
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <header>', () => {
    const markup = mount(() => <AppShellTopNav className="tn-cls" />).innerHTML
    expect(markup).toContain('tn-cls')
  })
})
