// @vitest-environment jsdom
/**
 * The nav's own visible text goes through `t()` — the Angular port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/storefront-top-nav-i18n.test.tsx`:
 * the same test names and assertions. The `accountMenuLabel`, `profileImageAlt`
 * and `signOutLabel` prop defaults now fall back through `useTranslation()`
 * from `@molecule/app-angular`; this suite mocks it with a `t` that marks every
 * key, so a default that bypassed `t()` would show up as plain English, and
 * asserts an explicit prop still overrides the translation.
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

import type * as AngularBinding from '@molecule/app-angular'
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

// Keep the binding's real router provider; replace only `useTranslation` with a
// `t` that echoes its key.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  return { ...actual, useTranslation: () => ({ t: (key: string) => `«${key}»` }) }
})

const { StorefrontTopNav } = await import('../storefront-top-nav.component.js')
const { provideDomPlacement, provideRouter } = await import('@molecule/app-angular')

/** What a mount hands back to the test. */
interface Mounted {
  /** The host element (the component's DOM). */
  host: HTMLElement
  /** The running application (change detection is manual). */
  appRef: ApplicationRef
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** The host template: the component element with every input the tests bind. */
const topNavTemplate = `<header
  mol-storefront-top-nav
  [brand]="p['brand']"
  [isAuthenticated]="p['isAuthenticated']"
  [profileImageUrl]="p['profileImageUrl']"
  [profileInitials]="p['profileInitials']"
  [profileImageAlt]="p['profileImageAlt']"
  [accountMenuLabel]="p['accountMenuLabel']"
  [authedMenu]="p['authedMenu']"
  [unauthedMenu]="p['unauthedMenu']"
  [onSignOut]="p['onSignOut']"
  [signOutLabel]="p['signOutLabel']"
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

describe('StorefrontTopNav i18n', () => {
  it('renders the account-menu label through t', async () => {
    const m = await renderTopNav()
    const trigger = m.host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«storefrontChrome.nav.accountMenu»')
  })

  it('an explicit accountMenuLabel overrides the translated label', async () => {
    const m = await renderTopNav({ accountMenuLabel: 'Your account' })
    const trigger = m.host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Your account')
  })

  it('renders the avatar alt through t', async () => {
    const m = await renderTopNav({ isAuthenticated: true, profileImageUrl: '/me.png' })
    const img = m.host.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('«storefrontChrome.nav.userProfile»')
  })

  it('an explicit profileImageAlt overrides the translated alt', async () => {
    const m = await renderTopNav({
      isAuthenticated: true,
      profileImageUrl: '/me.png',
      profileImageAlt: 'Ada',
    })
    const img = m.host.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('Ada')
  })

  it('renders the sign-out label through t', async () => {
    const m = await renderTopNav({ isAuthenticated: true, onSignOut: () => undefined })
    click(m, '[data-mol-id="profile-trigger-01"]')
    const signOut = m.host.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('«storefrontChrome.nav.signOut»')
  })

  it('an explicit signOutLabel overrides the translated label', async () => {
    const m = await renderTopNav({
      isAuthenticated: true,
      signOutLabel: 'Log out',
      onSignOut: () => undefined,
    })
    click(m, '[data-mol-id="profile-trigger-01"]')
    const signOut = m.host.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('Log out')
  })

  it('the default avatar glyph is hidden from the accessibility tree', async () => {
    const m = await renderTopNav()
    // The Material Symbols ligature name ("person") paints a glyph; the element
    // carries aria-hidden and the button's aria-label names the control.
    const glyph = m.host.querySelector('[data-icon="person"]')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
    const trigger = m.host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger).not.toBeNull()
    expect(trigger!.getAttribute('aria-label')).not.toBe('person')
  })
})
