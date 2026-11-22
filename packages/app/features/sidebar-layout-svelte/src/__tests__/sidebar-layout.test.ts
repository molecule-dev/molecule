// @vitest-environment jsdom
/**
 * Unit tests for `SidebarLayout` — a port of
 * `@molecule/app-sidebar-layout-react/src/__tests__/sidebar-layout.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom)
 * against mocked UI and router dependencies.
 *
 * @module
 */

import {
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  type Snippet,
  unmount,
} from 'svelte'
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

// The router markers: `Link` renders an anchor, the location is the current
// {@link locationState}, and `RoutedView` renders the routed page. The
// binding's `t` resolves a key's inline English default; the nav label's own
// test file exercises a marking provider.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { default: Link } = await import('./LinkMock.svelte')
  const { default: RoutedView } = await import('./RoutedViewMock.svelte')
  const { readable } = await import('svelte/store')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link,
    RoutedView,
    useLocation: () => readable({ pathname: locationState.pathname, search: '', hash: '' }),
    useTranslation: () => ({
      t: (
        key: string,
        _values: Record<string, unknown> | undefined,
        opts?: { defaultValue?: string },
      ) => opts?.defaultValue ?? key,
    }),
  }
})

const { SidebarLayout } = await import('../components.js')

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
  { to: '/settings', key: 'settings', label: 'Settings' },
]

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
  locationState.pathname = '/dashboard'
})

/**
 * The props {@link render} takes: the layout's own, with the shared nav items
 * defaulted so a test may override them.
 */
type RenderProps = Omit<ComponentProps<typeof SidebarLayout>, 'navItems'> & {
  /** Nav items for this mount; defaults to the shared {@link navItems}. */
  navItems?: ComponentProps<typeof SidebarLayout>['navItems']
}

/** Mounts a {@link SidebarLayout} with the given props and returns its markup. */
const render = ({ navItems: items = navItems, ...props }: RenderProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(
    mount(SidebarLayout, {
      target,
      props: { navItems: items, ...props },
    }),
  )
  flushSync()
  return target.innerHTML
}

describe('SidebarLayout', () => {
  it('renders the brand link with the app name', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup).toContain('Acme')
  })

  it('renders a link per nav item with its label', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Settings')
    expect(markup).toContain('data-mol-id="nav-dashboard"')
    expect(markup).toContain('data-mol-id="nav-settings"')
  })

  it('marks the nav item matching the current path as aria-current', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
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

  it('renders the userMenu and themeToggle slots', () => {
    const markup = render({
      appName: 'Acme',
      userMenu: raw('<div data-user-menu></div>'),
      themeToggle: raw('<div data-theme></div>'),
    })
    expect(markup).toContain('data-user-menu')
    expect(markup).toContain('data-theme')
  })

  it('labels the nav region and forwards className', () => {
    const markup = render({ appName: 'Acme', navAriaLabel: 'Main nav', className: 'sbl-cls' })
    expect(markup).toContain('aria-label="Main nav"')
    expect(markup).toContain('sbl-cls')
  })

  describe('ClassMap tokens (styling-agnostic)', () => {
    it('routes the shell / surfaces / borders through cm.* tokens', () => {
      const markup = render({ appName: 'Acme' })
      expect(markup).toContain('pageShell page')
      expect(markup).toContain('surface borderR')
      const withSlot = render({ appName: 'Acme', userMenu: raw('<div data-user-menu></div>') })
      expect(withSlot).toContain('borderT')
      expect(markup).toContain('pageShellContent')
    })

    it('styles the active vs inactive nav item with real theme tokens', () => {
      const markup = render({ appName: 'Acme' })
      expect(markup).toContain('bgPrimaryContainer textOnPrimaryContainer')
      expect(markup).toContain('textMuted link')
      expect(markup).toContain('roundedFull')
    })

    it('does NOT hardcode any raw Tailwind / Material-3 utility class', () => {
      const markup = render({ appName: 'Acme', userMenu: raw('<div data-user-menu></div>') })
      for (const rawCss of [
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
        expect(markup).not.toContain(rawCss)
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
      const markup = render({ appName: 'Acme' })
      expect(markup).toMatch(/width:\s*240px/)
    })

    it('maps sidebarWidth presets to fixed pixel widths', () => {
      expect(render({ appName: 'A', sidebarWidth: 'sm' })).toMatch(/width:\s*208px/)
      expect(render({ appName: 'A', sidebarWidth: 'md' })).toMatch(/width:\s*240px/)
      expect(render({ appName: 'A', sidebarWidth: 'lg' })).toMatch(/width:\s*256px/)
    })

    it('accepts an explicit pixel number', () => {
      const markup = render({ appName: 'A', sidebarWidth: 300 })
      expect(markup).toMatch(/width:\s*300px/)
    })

    it('parses the deprecated sidebarWidthClass to pixels without emitting the class', () => {
      const markup = render({ appName: 'A', sidebarWidthClass: 'w-64' })
      expect(markup).toMatch(/width:\s*256px/)
      expect(markup).not.toContain('w-64')
    })

    it('lets sidebarWidth take precedence over the deprecated sidebarWidthClass', () => {
      const markup = render({ appName: 'A', sidebarWidth: 'sm', sidebarWidthClass: 'w-64' })
      expect(markup).toMatch(/width:\s*208px/)
      expect(markup).not.toContain('width: 256px')
    })

    it('gives the main content area minWidth:0 so it can shrink in the flex row', () => {
      const markup = render({ appName: 'Acme' })
      expect(markup).toMatch(/min-width:\s*0px/)
    })
  })
})
