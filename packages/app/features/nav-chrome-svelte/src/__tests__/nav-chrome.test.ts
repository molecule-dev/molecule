// @vitest-environment jsdom
/**
 * Unit tests for the Svelte nav-chrome shells — a port of
 * `@molecule/app-nav-chrome-react`'s own suite: the same behavioral
 * assertions, rendered with Svelte in jsdom and asserted on the markup the
 * components produce.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { setMoleculeContext } from '@molecule/app-svelte'

import AppShellBottomNav from '../AppShellBottomNav.svelte'
import AppShellFooter from '../AppShellFooter.svelte'
import AppShellSideNav from '../AppShellSideNav.svelte'
import AppShellTopNav from '../AppShellTopNav.svelte'
import type { NavItem } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a node slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a component with the package's real ClassMap bond and returns its container. */
const render = <Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  // The composition root the conformance Host installs: no services, so the
  // component reads the bonded providers exactly as an app would.
  setMoleculeContext({})
  mounted.push(mount(component, { target: container, props }))
  flushSync()
  return container
}

const nav = (id: string, over: Partial<NavItem> = {}): NavItem => ({
  id,
  label: `label-${id}`,
  ...over,
})

describe('AppShellBottomNav', () => {
  it('renders every item label', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a'), nav('b')] }).innerHTML
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders item icons', () => {
    const markup = render(AppShellBottomNav, {
      items: [nav('a', { icon: raw('<i data-icon></i>') })],
    }).innerHTML
    expect(markup).toContain('data-icon=""')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = render(AppShellBottomNav, {
      items: [nav('a'), nav('b')],
      activeId: 'b',
    }).innerHTML
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables an item flagged disabled', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a', { disabled: true })] }).innerHTML
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('labels the nav region "Bottom" and forwards className', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a')], className: 'bn-cls' }).innerHTML
    expect(markup).toContain('aria-label="Bottom"')
    expect(markup).toContain('bn-cls')
  })
})

describe('AppShellFooter', () => {
  it('renders the logo and copyright', () => {
    const markup = render(AppShellFooter, {
      logo: raw('<span data-logo></span>'),
      copyright: '© 2026 Acme',
    }).innerHTML
    expect(markup).toContain('data-logo=""')
    expect(markup).toContain('© 2026 Acme')
  })

  it('renders links with their hrefs, falling back to "#" when no `to`', () => {
    const markup = render(AppShellFooter, {
      links: [{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }],
    }).innerHTML
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Privacy')
    expect(markup).toContain('href="#"')
    expect(markup).toContain('Terms')
  })

  it('omits the footer nav when links is empty or absent', () => {
    expect(render(AppShellFooter, { links: [] }).innerHTML).not.toContain('aria-label="Footer"')
    expect(render(AppShellFooter, {}).innerHTML).not.toContain('aria-label="Footer"')
  })

  it('renders the right slot', () => {
    const markup = render(AppShellFooter, { right: raw('<span data-right></span>') }).innerHTML
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <footer>', () => {
    const markup = render(AppShellFooter, { className: 'ft-cls' }).innerHTML
    expect(markup).toContain('ft-cls')
  })
})

describe('AppShellSideNav', () => {
  it('renders a flat list of items', () => {
    const markup = render(AppShellSideNav, { items: [nav('a'), nav('b')] }).innerHTML
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('renders grouped items with their headings', () => {
    const markup = render(AppShellSideNav, {
      groups: [
        { id: 'g1', heading: 'Main', items: [nav('a')] },
        { id: 'g2', heading: 'Settings', items: [nav('b')] },
      ],
    }).innerHTML
    expect(markup).toContain('Main')
    expect(markup).toContain('Settings')
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = render(AppShellSideNav, { items: [nav('a'), nav('b')], activeId: 'a' }).innerHTML
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = render(AppShellSideNav, {
      items: [nav('a', { badge: raw('<span data-badge></span>') })],
    }).innerHTML
    expect(markup).toContain('data-badge=""')
  })

  it('renders the header and footer slots', () => {
    const markup = render(AppShellSideNav, {
      items: [nav('a')],
      header: raw('<div data-header></div>'),
      footer: raw('<div data-footer></div>'),
    }).innerHTML
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('labels the nav region "Sidebar" and forwards className', () => {
    const markup = render(AppShellSideNav, { items: [nav('a')], className: 'sn-cls' }).innerHTML
    expect(markup).toContain('aria-label="Sidebar"')
    expect(markup).toContain('sn-cls')
  })
})

describe('AppShellTopNav', () => {
  it('renders the logo', () => {
    const markup = render(AppShellTopNav, { logo: raw('<span data-logo></span>') }).innerHTML
    expect(markup).toContain('data-logo=""')
  })

  it('renders nav items with labels', () => {
    const markup = render(AppShellTopNav, { items: [nav('a'), nav('b')] }).innerHTML
    expect(markup).toContain('label-a')
    expect(markup).toContain('label-b')
  })

  it('omits the centre nav when items is empty or absent', () => {
    expect(render(AppShellTopNav, { items: [] }).innerHTML).not.toContain('aria-label="Main"')
    expect(render(AppShellTopNav, {}).innerHTML).not.toContain('aria-label="Main"')
  })

  it('marks the active item with aria-current="page"', () => {
    const markup = render(AppShellTopNav, { items: [nav('a'), nav('b')], activeId: 'b' }).innerHTML
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', () => {
    const markup = render(AppShellTopNav, {
      items: [nav('a', { badge: raw('<span data-badge></span>') })],
    }).innerHTML
    expect(markup).toContain('data-badge=""')
  })

  it('renders the right slot', () => {
    const markup = render(AppShellTopNav, { right: raw('<span data-right></span>') }).innerHTML
    expect(markup).toContain('data-right=""')
  })

  it('forwards className onto the <header>', () => {
    const markup = render(AppShellTopNav, { className: 'tn-cls' }).innerHTML
    expect(markup).toContain('tn-cls')
  })
})
