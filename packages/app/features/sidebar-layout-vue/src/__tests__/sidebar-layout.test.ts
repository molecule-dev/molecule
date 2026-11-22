// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SidebarLayout` — a port of
 * `@molecule/app-sidebar-layout-react/src/__tests__/sidebar-layout.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// The current location the `useLocation` fake reads, so a test can move the
// active path before it renders.
const locationState = vi.hoisted(() => ({ pathname: '/dashboard' }))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `pageShell`), so tests can assert which cm.* class was applied without a real
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

// The router markers: `Link` renders an anchor with `data-link`, the location
// is the current {@link locationState}, and `RoutedView` renders the routed
// page. The binding's `t` resolves a key's inline English default; the nav
// label's own test file exercises a marking provider.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { computed, defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: defineComponent({
      name: 'Link',
      inheritAttrs: false,
      props: { to: { type: String, required: true }, replace: null, state: null },
      setup(props, { attrs, slots }) {
        return () => h('a', { ...attrs, href: props.to, 'data-link': '' }, slots.default?.())
      },
    }),
    RoutedView: defineComponent({
      name: 'RoutedView',
      setup: () => () => h('div', { 'data-outlet': '' }),
    }),
    useLocation: () => computed(() => ({ pathname: locationState.pathname, search: '', hash: '' })),
    useTranslation: () => ({
      t: (
        key: string,
        _values: Record<string, unknown> | undefined,
        opts?: { defaultValue?: string },
      ) => opts?.defaultValue ?? key,
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { SidebarLayout } from '../SidebarLayout.js'
import type { SidebarLayoutProps } from '../types.js'

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/settings', key: 'settings', label: 'Settings' },
]

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link SidebarLayout} and returns the markup it produced. */
const render = (props: SidebarLayoutProps, slots?: Record<string, () => VNodeChild[]>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(SidebarLayout, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('SidebarLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup).toContain('Acme')
  })

  it('renders a link per nav item with its label', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Settings')
    expect(markup).toContain('data-mol-id="nav-dashboard"')
    expect(markup).toContain('data-mol-id="nav-settings"')
  })

  it('marks the nav item matching the current path as aria-current', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the routed page in main when it has no children', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup).toMatch(/<main[^>]*><div data-outlet=""><\/div><\/main>/)
  })

  it('renders its children instead of the routed page', () => {
    const markup = render(
      { appName: 'Acme', navItems },
      { default: () => [h('p', null, 'Page body')] },
    )
    expect(markup).toMatch(/<main[^>]*><p>Page body<\/p><\/main>/)
    expect(markup).not.toContain('data-outlet')
  })

  it('renders the userMenu and themeToggle slots', () => {
    const markup = render({
      appName: 'Acme',
      navItems,
      userMenu: h('div', { 'data-user-menu': '' }),
      themeToggle: h('div', { 'data-theme': '' }),
    })
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-theme=""')
  })

  it('labels the nav region and forwards className', () => {
    const markup = render({
      appName: 'Acme',
      navItems,
      navAriaLabel: 'Main nav',
      className: 'sbl-cls',
    })
    expect(markup).toContain('aria-label="Main nav"')
    expect(markup).toContain('sbl-cls')
  })

  describe('ClassMap tokens (styling-agnostic)', () => {
    it('routes the shell / surfaces / borders through cm.* tokens', () => {
      const markup = render({ appName: 'Acme', navItems })
      expect(markup).toContain('pageShell page')
      expect(markup).toContain('surface borderR')
      const withSlot = render({
        appName: 'Acme',
        navItems,
        userMenu: h('div', { 'data-user-menu': '' }),
      })
      expect(withSlot).toContain('borderT')
      expect(markup).toContain('pageShellContent')
    })

    it('styles the active vs inactive nav item with real theme tokens', () => {
      const markup = render({ appName: 'Acme', navItems })
      expect(markup).toContain('bgPrimaryContainer textOnPrimaryContainer')
      expect(markup).toContain('textMuted link')
      expect(markup).toContain('roundedFull')
    })

    it('does NOT hardcode any raw Tailwind / Material-3 utility class', () => {
      const markup = render({
        appName: 'Acme',
        navItems,
        userMenu: h('div', { 'data-user-menu': '' }),
      })
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
      const markup = render({
        appName: 'Acme',
        navItems: [{ to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: 'Dashboard' }],
      })
      expect(markup).toContain('iconGlyphFont')
      expect(markup).toContain('>dashboard<')
    })
  })

  describe('stack-agnostic sidebar width', () => {
    it('defaults to the md preset (240px) applied via inline style, not a class', () => {
      const markup = render({ appName: 'Acme', navItems })
      expect(markup).toContain('width: 240px')
    })

    it('maps sidebarWidth presets to fixed pixel widths', () => {
      expect(render({ appName: 'A', navItems, sidebarWidth: 'sm' })).toContain('width: 208px')
      expect(render({ appName: 'A', navItems, sidebarWidth: 'md' })).toContain('width: 240px')
      expect(render({ appName: 'A', navItems, sidebarWidth: 'lg' })).toContain('width: 256px')
    })

    it('accepts an explicit pixel number', () => {
      const markup = render({ appName: 'A', navItems, sidebarWidth: 300 })
      expect(markup).toContain('width: 300px')
    })

    it('parses the deprecated sidebarWidthClass to pixels without emitting the class', () => {
      const markup = render({ appName: 'A', navItems, sidebarWidthClass: 'w-64' })
      expect(markup).toContain('width: 256px')
      expect(markup).not.toContain('w-64')
    })

    it('lets sidebarWidth take precedence over the deprecated sidebarWidthClass', () => {
      const markup = render({
        appName: 'A',
        navItems,
        sidebarWidth: 'sm',
        sidebarWidthClass: 'w-64',
      })
      expect(markup).toContain('width: 208px')
      expect(markup).not.toContain('width: 256px')
    })

    it('gives the main content area minWidth:0 so it can shrink in the flex row', () => {
      const markup = render({ appName: 'Acme', navItems })
      expect(markup).toContain('min-width: 0px')
    })
  })
})
