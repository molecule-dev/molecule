// @vitest-environment jsdom
/**
 * The nav's own visible text goes through `t()` — the Svelte port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/storefront-top-nav-i18n.test.tsx`:
 * the same test names and assertions. The `accountMenuLabel`, `profileImageAlt`
 * and `signOutLabel` prop defaults now fall back through `useTranslation()`
 * from `@molecule/app-svelte`; this suite mocks it with a `t` that marks every
 * key, so a default that bypassed `t()` would show up as plain English, and
 * asserts an explicit prop still overrides the translation.
 *
 * @module
 */

import { flushSync, mount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'
import type * as SvelteBinding from '@molecule/app-svelte'

import type { StorefrontTopNavProps } from '../types.js'
import StorefrontTopNavHost from './StorefrontTopNavHost.svelte'

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

// Keep the binding's real molecule context; replace only `useTranslation` with
// a `t` that echoes its key.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof SvelteBinding>()
  return { ...actual, useTranslation: () => ({ t: (key: string) => `«${key}»` }) }
})

/** The router every mount sits inside (the component's links need one). */
let router = createMemoryRouter({ initialEntries: ['/'] })

/**
 * The full props: the tests' overrides on top of the defaults they assume.
 *
 * @param props - The test's prop overrides.
 * @returns The complete props.
 */
const withDefaults = (props: Partial<StorefrontTopNavProps>): StorefrontTopNavProps => ({
  brand: 'Bazaar',
  isAuthenticated: false,
  ...props,
})

/**
 * Mounts a {@link StorefrontTopNav} inside the binding's molecule context and
 * returns the body the tests query.
 *
 * @param props - The component's props (over the test defaults).
 * @returns The document body.
 */
const renderTopNav = (props: Partial<StorefrontTopNavProps> = {}): HTMLElement => {
  mount(StorefrontTopNavHost, {
    target: document.body,
    props: { config: { router }, props: withDefaults(props) },
  })
  flushSync()
  return document.body
}

/**
 * Clicks an element and settles the re-render Svelte schedules.
 *
 * @param host - The mounted body.
 * @param selector - The element to click.
 */
const click = (host: HTMLElement, selector: string): void => {
  host.querySelector<HTMLElement>(selector)?.click()
  flushSync()
}

afterEach(() => {
  document.body.innerHTML = ''
  router = createMemoryRouter({ initialEntries: ['/'] })
})

describe('StorefrontTopNav i18n', () => {
  it('renders the account-menu label through t', () => {
    const host = renderTopNav()
    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«storefrontChrome.nav.accountMenu»')
  })

  it('an explicit accountMenuLabel overrides the translated label', () => {
    const host = renderTopNav({ accountMenuLabel: 'Your account' })
    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Your account')
  })

  it('renders the avatar alt through t', () => {
    const host = renderTopNav({ isAuthenticated: true, profileImageUrl: '/me.png' })
    const img = host.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('«storefrontChrome.nav.userProfile»')
  })

  it('an explicit profileImageAlt overrides the translated alt', () => {
    const host = renderTopNav({
      isAuthenticated: true,
      profileImageUrl: '/me.png',
      profileImageAlt: 'Ada',
    })
    const img = host.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('Ada')
  })

  it('renders the sign-out label through t', () => {
    const host = renderTopNav({ isAuthenticated: true, onSignOut: () => undefined })
    click(host, '[data-mol-id="profile-trigger-01"]')
    const signOut = host.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('«storefrontChrome.nav.signOut»')
  })

  it('an explicit signOutLabel overrides the translated label', () => {
    const host = renderTopNav({
      isAuthenticated: true,
      signOutLabel: 'Log out',
      onSignOut: () => undefined,
    })
    click(host, '[data-mol-id="profile-trigger-01"]')
    const signOut = host.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('Log out')
  })

  it('the default avatar glyph is hidden from the accessibility tree', () => {
    const host = renderTopNav()
    // The Material Symbols ligature name ("person") paints a glyph; the element
    // carries aria-hidden and the button's aria-label names the control.
    const glyph = host.querySelector('[data-icon="person"]')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).not.toBe('person')
  })
})
