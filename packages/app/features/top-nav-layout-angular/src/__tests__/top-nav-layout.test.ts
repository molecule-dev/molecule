// @vitest-environment jsdom
/**
 * Unit tests of `TopNavLayout` — the port of
 * `@molecule/app-top-nav-layout-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
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
const locationState = vi.hoisted(() => ({ pathname: '/' }))

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `topNavLayoutRoot`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => {
  // The ClassMap members whose value is a class string (the rest are methods,
  // which the proxy answers as functions), so a token used as a class value
  // renders as it does under the bonded ClassMap.
  const tokens = new Set([
    'bgPrimaryContainer',
    'iconGlyphFont',
    'textMuted',
    'textPrimary',
    'topNavLayoutHeader',
    'topNavLayoutNavItem',
    'topNavLayoutNavItemIdle',
    'topNavLayoutNavItemLabel',
    'topNavLayoutRoot',
  ])
  return {
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
          if (tokens.has(token)) return token
          return (..._args: unknown[]) => token
        },
      }
      return new Proxy({}, handler)
    },
  }
})

// The router markers: `Link` renders an anchor, `RoutedView` renders the
// routed page, and the location is the current {@link locationState}.
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
    changeDetection: ChangeDetectionStrategy.Eager,
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
    // The component's own text renders through `t`; without a bonded provider
    // the translation falls back to the call's `defaultValue`.
    useTranslation: () => ({
      t: (_key: string, _values?: unknown, options?: { defaultValue?: string }): string =>
        options?.defaultValue ?? _key,
    }),
  }
})

const { TopNavLayout } = await import('../top-nav-layout.component.js')

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
    changeDetection: ChangeDetectionStrategy.Eager,
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
  { to: '/reports', key: 'reports', label: 'Reports' },
]

/** The host template every case renders, with the props object's bindings. */
const template = (content = ''): string =>
  `<div mol-top-nav-layout [appName]="p['appName']" [logoTo]="p['logoTo']" [navItems]="p['navItems']" [navAriaLabel]="p['navAriaLabel']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`

const render = async (props: Record<string, unknown> = {}, content = 'x'): Promise<Mounted> => {
  const m = await mount(template(content), TopNavLayout as Type<unknown>, {
    navItems,
    ...props,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  locationState.pathname = '/'
})

/**
 * The inner markup of the layout's `<main>`.
 *
 * @param markup - The rendered markup.
 * @returns The main content.
 */
const mainContent = (markup: string): string =>
  markup.match(/<main[^>]*>([\s\S]*)<\/main>/)?.[1] ?? ''

/**
 * The opening tag of the link whose accessible name is `label`.
 *
 * @param markup - The rendered markup.
 * @param label - The link's `aria-label`.
 * @returns The tag, or undefined.
 */
const linkTag = (markup: string, label: string): string | undefined =>
  markup.match(new RegExp(`<a [^>]*aria-label="${label}"[^>]*>`))?.[0]

describe('TopNavLayout', () => {
  it('renders the brand link with the app name', async () => {
    const m = await render({ appName: 'Acme' })
    expect(m.host.innerHTML).toContain('data-link')
    expect(m.host.innerHTML).toContain('Acme')
  })

  it('renders a link per nav item with its label', async () => {
    const m = await render({ appName: 'Acme' })
    expect(m.host.innerHTML.match(/<a [^>]*aria-label=/g) ?? []).toHaveLength(2)
    expect(m.host.innerHTML).toContain('Dashboard')
    expect(m.host.innerHTML).toContain('Reports')
  })

  it('marks the nav item matching the current path as aria-current', async () => {
    locationState.pathname = '/dashboard/settings'
    const nested = await render({ appName: 'Acme' })
    expect(linkTag(nested.host.innerHTML, 'Dashboard')).toContain('aria-current="page"')
    expect(linkTag(nested.host.innerHTML, 'Reports')).not.toContain('aria-current')
    // A longer segment that only starts with the item's path is another page.
    locationState.pathname = '/dashboard-archive'
    const sibling = await render({ appName: 'Acme' })
    expect(linkTag(sibling.host.innerHTML, 'Dashboard')).not.toContain('aria-current')
  })

  it('renders the routed page in main when it has no children', async () => {
    const m = await render({ appName: 'Acme' }, '')
    expect(mainContent(m.host.innerHTML)).toContain('data-outlet')
  })

  it('renders its children instead of the routed page', async () => {
    const m = await render({ appName: 'Acme' }, '<p>Page body</p>')
    expect(mainContent(m.host.innerHTML)).toContain('<p>Page body</p>')
    expect(m.host.innerHTML).not.toContain('data-outlet')
  })

  it('renders the userMenu slot', async () => {
    const m = await render({ appName: 'Acme' }, '<div slot="userMenu" data-user-menu></div>')
    expect(m.host.innerHTML).toContain('data-user-menu')
  })

  it('labels the nav region and forwards className', async () => {
    const m = await render({ appName: 'Acme', navAriaLabel: 'Top nav', className: 'tnl-cls' })
    expect(m.host.innerHTML).toContain('aria-label="Top nav"')
    expect(m.host.innerHTML).toContain('tnl-cls')
  })

  it('sets the data-mol-id on the outer wrapper', async () => {
    const m = await render({ appName: 'Acme', dataMolId: 'tnl-x' })
    expect(m.host.innerHTML).toContain('data-mol-id="tnl-x"')
  })

  it('shows and removes the page wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render({ appName: 'Acme', on: false }, `@if (p['on']) {<p data-page>Page</p>}`)
    const page = (): HTMLElement | null => m.host.querySelector('[data-page]')
    // No projected page: React renders the routed view instead.
    expect(page()).toBeNull()
    expect(m.host.innerHTML).toContain('data-outlet')
    await m.setProps({ on: true })
    // The page arrives: it renders in the same pass and the routed view goes.
    expect(page()).not.toBeNull()
    expect(page()?.isConnected).toBe(true)
    expect(m.host.innerHTML).not.toContain('data-outlet')
    await m.setProps({ on: false })
    expect(page()).toBeNull()
    expect(m.host.innerHTML).toContain('data-outlet')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    // The host IS React's outer `<div>`, so it stays; the page body projects
    // straight into `<main>` through the (hidden) capture span.
    const m = await mount(
      `<i>a</i><div mol-top-nav-layout [appName]="p['appName']" [navItems]="p['navItems']">@if (p['on']) {<p data-page>Page</p>}</div><i>b</i>`,
      TopNavLayout as Type<unknown>,
      { appName: 'Acme', navItems, on: false },
    )
    mounted.push(m)
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(children()).toEqual(['i', 'div', 'i'])
    await m.setProps({ on: true })
    expect(children()).toEqual(['i', 'div', 'i'])
    // No capture span remains: the projected page is a DIRECT child of <main>.
    const main = m.host.querySelector('main')
    const page = m.host.querySelector('[data-page]')
    expect(page).not.toBeNull()
    expect(page?.parentElement).toBe(main)
  })
})
