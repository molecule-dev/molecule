// @vitest-environment jsdom
/**
 * The nav's own visible text goes through `t()` — the Vue port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/storefront-top-nav-i18n.test.tsx`:
 * the same test names and assertions. The `accountMenuLabel`, `profileImageAlt`
 * and `signOutLabel` prop defaults now fall back through `useTranslation()`
 * from `@molecule/app-vue`; this suite mocks it with a `t` that marks every
 * key, so a default that bypassed `t()` would show up as plain English, and
 * asserts an explicit prop still overrides the translation.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'

import { createMemoryRouter } from '@molecule/app-routing'
import type * as VueBinding from '@molecule/app-vue'
import { createRouterPlugin } from '@molecule/app-vue'

import { StorefrontTopNav } from '../StorefrontTopNav.js'

// The same ClassMap proxy the React tests use: each accessed member echoes its
// token back, so the components need no real styling bond.
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

// Keep the binding's real router Link/plugin; replace only `useTranslation`
// with a `t` that echoes its key.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof VueBinding>()
  return { ...actual, useTranslation: () => ({ t: (key: string) => `«${key}»` }) }
})

/** The router every mount sits inside (the component's links need one). */
const router = createMemoryRouter({ initialEntries: ['/'] })

/** Mounts awaiting teardown. */
const mounted: Array<{ app: ReturnType<typeof createApp>; host: HTMLElement }> = []

/**
 * Mounts a {@link StorefrontTopNav} with the given props and returns its host.
 *
 * @param props - The component's props.
 * @returns The host element.
 */
const renderTopNav = (props: Record<string, unknown>): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(StorefrontTopNav, props)
  app.use(createRouterPlugin(router))
  app.mount(host)
  mounted.push({ app, host })
  return host
}

/**
 * Clicks an element and settles the re-render Vue schedules.
 *
 * @param host - The mounted host.
 * @param selector - The element to click.
 */
const click = async (host: HTMLElement, selector: string): Promise<void> => {
  host.querySelector<HTMLElement>(selector)?.click()
  await nextTick()
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
  document.body.innerHTML = ''
})

describe('StorefrontTopNav i18n', () => {
  it('renders the account-menu label through t', () => {
    const host = renderTopNav({ brand: 'Bazaar', isAuthenticated: false })
    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«storefrontChrome.nav.accountMenu»')
  })

  it('an explicit accountMenuLabel overrides the translated label', () => {
    const host = renderTopNav({
      brand: 'Bazaar',
      isAuthenticated: false,
      accountMenuLabel: 'Your account',
    })
    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Your account')
  })

  it('renders the avatar alt through t', () => {
    const host = renderTopNav({
      brand: 'Bazaar',
      isAuthenticated: true,
      profileImageUrl: '/me.png',
    })
    const img = host.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('«storefrontChrome.nav.userProfile»')
  })

  it('an explicit profileImageAlt overrides the translated alt', () => {
    const host = renderTopNav({
      brand: 'Bazaar',
      isAuthenticated: true,
      profileImageUrl: '/me.png',
      profileImageAlt: 'Ada',
    })
    const img = host.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('Ada')
  })

  it('renders the sign-out label through t', async () => {
    const host = renderTopNav({
      brand: 'Bazaar',
      isAuthenticated: true,
      onSignOut: () => undefined,
    })
    await click(host, '[data-mol-id="profile-trigger-01"]')
    const signOut = host.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('«storefrontChrome.nav.signOut»')
  })

  it('an explicit signOutLabel overrides the translated label', async () => {
    const host = renderTopNav({
      brand: 'Bazaar',
      isAuthenticated: true,
      signOutLabel: 'Log out',
      onSignOut: () => undefined,
    })
    await click(host, '[data-mol-id="profile-trigger-01"]')
    const signOut = host.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('Log out')
  })

  it('the default avatar glyph is hidden from the accessibility tree', () => {
    const host = renderTopNav({ brand: 'Bazaar', isAuthenticated: false })
    // The Material Symbols ligature name ("person") paints a glyph; the element
    // carries aria-hidden and the button's aria-label names the control.
    const glyph = host.querySelector('[data-icon="person"]')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger).not.toBeNull()
    expect(trigger!.getAttribute('aria-label')).not.toBe('person')
  })
})
