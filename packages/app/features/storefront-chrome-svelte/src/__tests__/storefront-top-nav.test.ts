// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `StorefrontTopNav` — a port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/StorefrontTopNav.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces. The router link is the binding's real
 * `Link`, mounted inside the binding's molecule context (the React suite mocked
 * its router links as plain anchors).
 *
 * @module
 */

import { flushSync, mount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'

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
