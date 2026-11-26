// @vitest-environment jsdom
/**
 * Unit tests for the Solid `StorefrontTopNav` — a port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/StorefrontTopNav.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces. The router link is the binding's real
 * `Link`, mounted inside the binding's router (the React suite mocked its
 * router links as plain anchors).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// The same ClassMap proxy the React tests use: each accessed member echoes its
// token back, so the components need no real styling bond.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { render } from 'solid-js/web'

import { createMemoryRouter } from '@molecule/app-routing'
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

describe('StorefrontTopNav account/sign-in menu reachability', () => {
  it('renders the sign-in menu entry point WITHOUT a profileImageUrl (default avatar icon)', () => {
    const host = renderTopNav({
      isAuthenticated: false,
      unauthedMenu: [
        { to: '/login', label: 'Sign in', dataMolId: 'nav-login' },
        { to: '/signup', label: 'Create account', dataMolId: 'nav-signup' },
      ],
    })

    const trigger = host.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger).not.toBeNull()
    // no avatar image, but a default avatar icon fallback is present
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-icon="person"]')).not.toBeNull()

    // the menu is genuinely reachable: opening it reveals the sign-in links
    click(host, '[data-mol-id="profile-trigger-01"]')
    expect(host.textContent).toContain('Sign in')
    expect(host.textContent).toContain('Create account')
  })

  it('falls back to initials when profileInitials is set and no image', () => {
    const host = renderTopNav({
      brand: 'B',
      isAuthenticated: true,
      profileInitials: 'JD',
      authedMenu: [{ to: '/settings', label: 'My Account' }],
    })

    expect(host.querySelector('[data-mol-id="profile-trigger-01"]')).not.toBeNull()
    expect(host.textContent).toContain('JD')
    expect(host.querySelector('img')).toBeNull()
  })

  it('still renders the avatar image when profileImageUrl is present', () => {
    const host = renderTopNav({
      brand: 'B',
      isAuthenticated: true,
      profileImageUrl: '/me.png',
      profileImageAlt: 'Me',
      authedMenu: [{ to: '/settings', label: 'My Account' }],
    })

    const img = host.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('/me.png')
    // entry point is still present alongside the avatar
    expect(host.querySelector('[data-mol-id="profile-trigger-01"]')).not.toBeNull()
  })

  it('opens the authed account menu (My Account + Sign Out) when signed in', () => {
    const host = renderTopNav({
      brand: 'B',
      isAuthenticated: true,
      authedMenu: [{ to: '/settings', label: 'My Account' }],
      onSignOut: () => undefined,
    })

    click(host, '[data-mol-id="profile-trigger-01"]')
    expect(host.textContent).toContain('My Account')
    expect(host.querySelector('[data-mol-id="profile-link-signout"]')).not.toBeNull()
  })
})
