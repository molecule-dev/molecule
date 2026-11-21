// @vitest-environment jsdom
/**
 * The nav's own visible text goes through `t()` — the Solid port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/storefront-top-nav-i18n.test.tsx`:
 * the same test names and assertions. The `accountMenuLabel`, `profileImageAlt`
 * and `signOutLabel` prop defaults now fall back through `useTranslation()`
 * from `@molecule/app-solid`; this suite mocks it with a `t` that marks every
 * key, so a default that bypassed `t()` would show up as plain English, and
 * asserts an explicit prop still overrides the translation.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Keep the binding's real router context; replace only `useTranslation` with a
// `t` that echoes its key.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof SolidBinding>()
  return { ...actual, useTranslation: () => ({ t: (key: string) => `«${key}»` }) }
})

import { render } from 'solid-js/web'

import { createMemoryRouter } from '@molecule/app-routing'
import type * as SolidBinding from '@molecule/app-solid'
import { RouterContext } from '@molecule/app-solid'

import { StorefrontTopNav } from '../StorefrontTopNav.jsx'
import type { StorefrontTopNavProps } from '../types.js'

/** The router every mount sits inside (the component's links need one). */
let router = createMemoryRouter({ initialEntries: ['/'] })

/** Mounts awaiting teardown. */
const disposers: Array<() => void> = []

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
 * Mounts a {@link StorefrontTopNav} inside the binding's router and returns its
 * container.
 *
 * @param props - The component's props (over the test defaults).
 * @returns The container element.
 */
const renderTopNav = (props: Partial<StorefrontTopNavProps> = {}): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const all = withDefaults(props)
  disposers.push(
    render(
      () => (
        <RouterContext.Provider value={router}>
          <StorefrontTopNav {...all} />
        </RouterContext.Provider>
      ),
      container,
    ),
  )
  return container
}

/**
 * Clicks an element (Solid's delegated click handlers run synchronously).
 *
 * @param host - The mounted container.
 * @param selector - The element to click.
 */
const click = (host: HTMLElement, selector: string): void => {
  host.querySelector<HTMLElement>(selector)?.click()
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  router = createMemoryRouter({ initialEntries: ['/'] })
  document.body.innerHTML = ''
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
