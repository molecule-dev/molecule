// @vitest-environment jsdom
/**
 * Unit tests of the Angular `StorefrontTopNav` — the port of
 * `@molecule/app-storefront-chrome-react`'s own suite. The React suite renders
 * the component with mocked styling and plain-anchor router links; this port
 * mounts the same tree through Angular's real renderer (the `createApplication`
 * + JIT host approach the conformance kit's Angular adapter uses), with the
 * host element written exactly the way an Angular app would write it.
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

import { createMemoryRouter } from '@molecule/app-routing'

// The same ClassMap proxy the React tests use: each accessed member echoes its
// token back, so the component needs no real styling bond.
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
        return (...args: unknown[]) => `mock-${token}-${args.join('-')}`
      },
    }
    return new Proxy({}, handler)
  },
}))

const { StorefrontTopNav } = await import('../storefront-top-nav.component.js')
const { provideDomPlacement, provideRouter } = await import('@molecule/app-angular')

/** What a mount hands back to the test. */
interface Mounted {
  /** The host element (the component's DOM). */
  host: HTMLElement
  /** The running application (change detection is manual). */
  appRef: ApplicationRef
  /** Merges props over the current ones and flushes change detection. */
  set(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** The host template: the component element with every input it reads. */
const topNavTemplate = `<header
  mol-storefront-top-nav
  [brand]="p['brand']"
  [isAuthenticated]="p['isAuthenticated']"
  [profileImageUrl]="p['profileImageUrl']"
  [profileInitials]="p['profileInitials']"
  [profileImageAlt]="p['profileImageAlt']"
  [authedMenu]="p['authedMenu']"
  [unauthedMenu]="p['unauthedMenu']"
  [onSignOut]="p['onSignOut']"
></header>`

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param template - The host template (the component element).
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
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideRouter(createMemoryRouter({ initialEntries: ['/'] })),
    ],
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
    appRef,
    set: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** Mounts awaiting teardown. */
const mounted: Mounted[] = []

/**
 * Renders a {@link StorefrontTopNav} with the given props, tracked for teardown.
 *
 * @param props - The props to bind (over the defaults the tests assume).
 * @returns The mounted host.
 */
async function renderTopNav(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(topNavTemplate, StorefrontTopNav as Type<unknown>, {
    brand: 'Bazaar',
    isAuthenticated: false,
    ...props,
  })
  mounted.push(m)
  return m
}

/**
 * Clicks an element and runs change detection, as the browser's click would.
 *
 * @param m - The mounted host.
 * @param selector - The element to click.
 */
function click(m: Mounted, selector: string): void {
  m.host.querySelector<HTMLElement>(selector)?.click()
  m.appRef.tick()
}

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
})

describe('StorefrontTopNav account/sign-in menu reachability', () => {
  it('renders the sign-in menu entry point WITHOUT a profileImageUrl (default avatar icon)', async () => {
    const m = await renderTopNav({
      isAuthenticated: false,
      unauthedMenu: [
        { to: '/login', label: 'Sign in', dataMolId: 'nav-login' },
        { to: '/signup', label: 'Create account', dataMolId: 'nav-signup' },
      ],
    })

    const trigger = m.host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger).not.toBeNull()
    // no avatar image, but a default avatar icon fallback is present
    expect(m.host.querySelector('img')).toBeNull()
    expect(m.host.querySelector('[data-icon="person"]')).not.toBeNull()

    // the menu is genuinely reachable: opening it reveals the sign-in links
    click(m, '[data-mol-id="profile-trigger-01"]')
    expect(m.host.textContent).toContain('Sign in')
    expect(m.host.textContent).toContain('Create account')
  })

  it('falls back to initials when profileInitials is set and no image', async () => {
    const m = await renderTopNav({
      brand: 'B',
      isAuthenticated: true,
      profileInitials: 'JD',
      authedMenu: [{ to: '/settings', label: 'My Account' }],
    })

    expect(m.host.querySelector('[data-mol-id="profile-trigger-01"]')).not.toBeNull()
    expect(m.host.textContent).toContain('JD')
    expect(m.host.querySelector('img')).toBeNull()
  })

  it('still renders the avatar image when profileImageUrl is present', async () => {
    const m = await renderTopNav({
      brand: 'B',
      isAuthenticated: true,
      profileImageUrl: '/me.png',
      profileImageAlt: 'Me',
      authedMenu: [{ to: '/settings', label: 'My Account' }],
    })

    const img = m.host.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('/me.png')
    // entry point is still present alongside the avatar
    expect(m.host.querySelector('[data-mol-id="profile-trigger-01"]')).not.toBeNull()
  })

  it('opens the authed account menu (My Account + Sign Out) when signed in', async () => {
    const m = await renderTopNav({
      brand: 'B',
      isAuthenticated: true,
      authedMenu: [{ to: '/settings', label: 'My Account' }],
      onSignOut: () => undefined,
    })

    click(m, '[data-mol-id="profile-trigger-01"]')
    expect(m.host.textContent).toContain('My Account')
    expect(m.host.querySelector('[data-mol-id="profile-link-signout"]')).not.toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><header mol-storefront-top-nav [brand]="p['brand']">@if (p['on']) {<b slot="brand" data-brand>Brand</b>}</header><i>b</i>`,
      StorefrontTopNav as Type<unknown>,
      { brand: undefined, on: false },
    )
    mounted.push(m)
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    const brandLink = (): HTMLAnchorElement =>
      m.host.querySelector('a[data-mol-id="brand-logo-01"]') as HTMLAnchorElement
    // The host IS React's <header>; the brand capture span never reaches the page.
    expect(tags()).toEqual(['i', 'header', 'i'])
    expect(brandLink().querySelector('span')).toBeNull()
    expect(brandLink().querySelector('[data-brand]')).toBeNull()
    // Projected brand content renders bare inside the brand link.
    m.set({ on: true })
    expect(tags()).toEqual(['i', 'header', 'i'])
    expect(brandLink().querySelector('[data-brand]')).not.toBeNull()
    expect(brandLink().querySelector('span')).toBeNull()
  })
})
