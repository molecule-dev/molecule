// @vitest-environment jsdom
/**
 * Unit tests of `SidebarLayout` — the port of
 * `@molecule/app-sidebar-layout-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// The current location the `useRouterInstance` fake reads, so a test can move
// the active path before it renders.
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

// The router markers: `Link` renders an anchor, `RoutedView` renders the
// routed page, and the location is the current {@link locationState}. The
// binding's `t` resolves a key's inline English default; the nav label's own
// test file exercises a marking provider.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { Component, Directive } = await import('@angular/core')
  const Link = Directive({
    selector: 'a[molLink]',
    standalone: true,
    inputs: ['molLink'],
    host: { '[attr.href]': 'molLink', 'data-link': '' },
  })(
    class MockLink {
      /** The link's destination. */
      molLink = ''
    },
  )
  const RoutedView = Component({
    selector: 'mol-routed-view',
    standalone: true,
    template: '<div data-outlet=""></div>',
  })(
    class MockRoutedView {
      /** The routed view stub. */
      readonly stub = true
    },
  )
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link,
    RoutedView,
    useRouterInstance: () => ({
      getLocation: () => ({ pathname: locationState.pathname, search: '', hash: '' }),
      subscribe: () => () => undefined,
    }),
    useTranslation: () => ({
      t: (
        key: string,
        _values: Record<string, unknown> | undefined,
        opts?: { defaultValue?: string },
      ) => opts?.defaultValue ?? key,
    }),
  }
})

const { SidebarLayout } = await import('../sidebar-layout.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/settings', key: 'settings', label: 'Settings' },
]

/** The host template every case renders, with the props object's bindings. */
const template = (content = ''): string =>
  `<div mol-sidebar-layout [appName]="p['appName']" [logoTo]="p['logoTo']" [navItems]="p['navItems']" [navAriaLabel]="p['navAriaLabel']" [sidebarWidth]="p['sidebarWidth']" [sidebarWidthClass]="p['sidebarWidthClass']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`

const render = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(template(content), SidebarLayout as Type<unknown>, {
    navItems,
    ...props,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  locationState.pathname = '/dashboard'
})

/**
 * The inner markup of the layout's `<main>`.
 *
 * @param markup - The rendered markup.
 * @returns The main content.
 */
const mainContent = (markup: string): string =>
  markup.match(/<main[^>]*>([\s\S]*)<\/main>/)?.[1] ?? ''

describe('SidebarLayout', () => {
  it('renders the brand link with the app name', async () => {
    const m = await render({ appName: 'Acme' })
    expect(m.host.innerHTML).toContain('data-link')
    expect(m.host.innerHTML).toContain('Acme')
  })

  it('renders a link per nav item with its label', async () => {
    const m = await render({ appName: 'Acme' })
    expect(m.host.innerHTML).toContain('Dashboard')
    expect(m.host.innerHTML).toContain('Settings')
    expect(m.host.innerHTML).toContain('data-mol-id="nav-dashboard"')
    expect(m.host.innerHTML).toContain('data-mol-id="nav-settings"')
  })

  it('marks the nav item matching the current path as aria-current', async () => {
    const m = await render({ appName: 'Acme' })
    expect(m.host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the routed page in main when it has no children', async () => {
    const m = await render({ appName: 'Acme' })
    expect(mainContent(m.host.innerHTML)).toContain('data-outlet')
  })

  it('renders its children instead of the routed page', async () => {
    const m = await render({ appName: 'Acme' }, '<p>Page body</p>')
    expect(mainContent(m.host.innerHTML)).toContain('<p>Page body</p>')
    expect(m.host.innerHTML).not.toContain('data-outlet')
  })

  it('renders the userMenu and themeToggle slots', async () => {
    const m = await render(
      { appName: 'Acme' },
      '<div slot="userMenu" data-user-menu></div><div slot="themeToggle" data-theme></div>',
    )
    expect(m.host.innerHTML).toContain('data-user-menu')
    expect(m.host.innerHTML).toContain('data-theme')
  })

  it('labels the nav region and forwards className', async () => {
    const m = await render({ appName: 'Acme', navAriaLabel: 'Main nav', className: 'sbl-cls' })
    expect(m.host.innerHTML).toContain('aria-label="Main nav"')
    expect(m.host.innerHTML).toContain('sbl-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of the userMenu slot', async () => {
    const m = await render(
      { appName: 'A', xs: ['a', 'c'] },
      `@for (x of p['xs']; track x) {<b slot="userMenu">{{ x }}</b>}`,
    )
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(shown()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(shown()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(shown()).toEqual(['a', 'c'])
  })

  describe('ClassMap tokens (styling-agnostic)', () => {
    it('routes the shell / surfaces / borders through cm.* tokens', async () => {
      const m = await render({ appName: 'Acme' })
      // Angular's class binding applies tokens as a set (alphabetically), so
      // the order React emits is not observable here — each token is.
      expect(m.host.innerHTML).toContain('pageShell')
      expect(m.host.innerHTML).toContain('surface')
      expect(m.host.innerHTML).toContain('borderR')
      const withSlot = await render(
        { appName: 'Acme' },
        '<div slot="userMenu" data-user-menu></div>',
      )
      expect(withSlot.host.innerHTML).toContain('borderT')
      expect(m.host.innerHTML).toContain('pageShellContent')
    })

    it('styles the active vs inactive nav item with real theme tokens', async () => {
      const m = await render({ appName: 'Acme' })
      const active = m.host.querySelector('a[aria-current="page"]')?.getAttribute('class') ?? ''
      expect(active).toContain('bgPrimaryContainer')
      expect(active).toContain('textOnPrimaryContainer')
      const idle = m.host.querySelector('nav a:not([aria-current])')?.getAttribute('class') ?? ''
      expect(idle).toContain('textMuted')
      expect(idle).toContain('link')
      expect(m.host.innerHTML).toContain('roundedFull')
    })

    it('does NOT hardcode any raw Tailwind / Material-3 utility class', async () => {
      const m = await render({ appName: 'Acme' }, '<div slot="userMenu" data-user-menu></div>')
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
        expect(m.host.innerHTML).not.toContain(raw)
      }
    })

    it('keeps the documented Material Symbols icon-font exception for nav icons', async () => {
      const m = await render({
        appName: 'Acme',
        navItems: [{ to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: 'Dashboard' }],
      })
      expect(m.host.innerHTML).toContain('iconGlyphFont')
      expect(m.host.innerHTML).toContain('>dashboard<')
    })
  })

  describe('stack-agnostic sidebar width', () => {
    it('defaults to the md preset (240px) applied via inline style, not a class', async () => {
      const m = await render({ appName: 'Acme' })
      expect(m.host.innerHTML).toMatch(/width:\s*240px/)
    })

    it('maps sidebarWidth presets to fixed pixel widths', async () => {
      expect((await render({ appName: 'A', sidebarWidth: 'sm' })).host.innerHTML).toMatch(
        /width:\s*208px/,
      )
      expect((await render({ appName: 'A', sidebarWidth: 'md' })).host.innerHTML).toMatch(
        /width:\s*240px/,
      )
      expect((await render({ appName: 'A', sidebarWidth: 'lg' })).host.innerHTML).toMatch(
        /width:\s*256px/,
      )
    })

    it('accepts an explicit pixel number', async () => {
      const m = await render({ appName: 'A', sidebarWidth: 300 })
      expect(m.host.innerHTML).toMatch(/width:\s*300px/)
    })

    it('parses the deprecated sidebarWidthClass to pixels without emitting the class', async () => {
      const m = await render({ appName: 'A', sidebarWidthClass: 'w-64' })
      expect(m.host.innerHTML).toMatch(/width:\s*256px/)
      expect(m.host.innerHTML).not.toContain('w-64')
    })

    it('lets sidebarWidth take precedence over the deprecated sidebarWidthClass', async () => {
      const m = await render({ appName: 'A', sidebarWidth: 'sm', sidebarWidthClass: 'w-64' })
      expect(m.host.innerHTML).toMatch(/width:\s*208px/)
      expect(m.host.innerHTML).not.toContain('width: 256px')
    })

    it('gives the main content area minWidth:0 so it can shrink in the flex row', async () => {
      const m = await render({ appName: 'Acme' })
      expect(m.host.innerHTML).toMatch(/min-width:\s*0px/)
    })
  })
})
