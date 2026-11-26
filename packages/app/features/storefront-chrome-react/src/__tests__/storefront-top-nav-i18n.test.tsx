// @vitest-environment jsdom
/**
 * The nav's own visible text goes through `t()`.
 *
 * `accountMenuLabel`, `profileImageAlt` and `signOutLabel` were prop-parameter
 * defaults (`accountMenuLabel = 'Account menu'`), so they rendered plain English
 * in every locale — the pseudo-locale check saw them in the recorded goldens and
 * no lint rule sees a parameter default. These tests mock `useTranslation` with a
 * `t` that marks every key, so a default that bypassed `t()` would show up as
 * plain English, and assert an explicit prop still overrides the translation.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The same ClassMap proxy the React suite uses: each accessed member echoes its
// token back, so the component needs no real styling bond.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, p) =>
          p === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (...args: unknown[]) => `mock-${String(p)}-${args.join('-')}`,
      },
    ),
}))

// Render router links as plain anchors so nothing needs a real router.
vi.mock('@molecule/app-react/link', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Link: ({
    children,
    to,
    ...rest
  }: { children?: unknown; to?: string } & Record<string, unknown>) =>
    createElement('a', { href: to, ...rest }, children as never),
}))

// A `t` that echoes its key: a label that bypassed t() would show as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { StorefrontTopNav } = await import('../StorefrontTopNav.js')

afterEach(cleanup)

describe('StorefrontTopNav i18n', () => {
  it('renders the account-menu label through t', () => {
    const { container } = render(
      createElement(StorefrontTopNav, { brand: 'Bazaar', isAuthenticated: false }),
    )
    const trigger = container.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«storefrontChrome.nav.accountMenu»')
  })

  it('an explicit accountMenuLabel overrides the translated label', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'Bazaar',
        isAuthenticated: false,
        accountMenuLabel: 'Your account',
      }),
    )
    const trigger = container.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Your account')
  })

  it('renders the avatar alt through t', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'Bazaar',
        isAuthenticated: true,
        profileImageUrl: '/me.png',
      }),
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('«storefrontChrome.nav.userProfile»')
  })

  it('an explicit profileImageAlt overrides the translated alt', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'Bazaar',
        isAuthenticated: true,
        profileImageUrl: '/me.png',
        profileImageAlt: 'Ada',
      }),
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('Ada')
  })

  it('renders the sign-out label through t', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'Bazaar',
        isAuthenticated: true,
        onSignOut: () => undefined,
      }),
    )
    fireEvent.click(container.querySelector('[data-mol-id="profile-trigger-01"]') as Element)
    const signOut = container.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('«storefrontChrome.nav.signOut»')
  })

  it('an explicit signOutLabel overrides the translated label', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'Bazaar',
        isAuthenticated: true,
        signOutLabel: 'Log out',
        onSignOut: () => undefined,
      }),
    )
    fireEvent.click(container.querySelector('[data-mol-id="profile-trigger-01"]') as Element)
    const signOut = container.querySelector('[data-mol-id="profile-link-signout"]')
    expect(signOut?.textContent).toBe('Log out')
  })

  it('the default avatar glyph is hidden from the accessibility tree', () => {
    const { container } = render(
      createElement(StorefrontTopNav, { brand: 'Bazaar', isAuthenticated: false }),
    )
    // The Material Symbols ligature name ("person") paints a glyph; the element
    // carries aria-hidden and the button's aria-label names the control.
    const glyph = container.querySelector('[data-icon="person"]')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
    const trigger = container.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger).not.toBeNull()
    expect(trigger!.getAttribute('aria-label')).not.toBe('person')
  })
})
