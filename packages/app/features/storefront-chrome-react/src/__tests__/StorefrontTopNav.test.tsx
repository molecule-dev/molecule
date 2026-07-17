import { createElement } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
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

// Render router links as plain anchors so nothing needs a real <Router>.
vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: { children?: unknown; to?: string } & Record<string, unknown>) =>
    createElement('a', { href: to, ...rest }, children as never),
}))

const { StorefrontTopNav } = await import('../StorefrontTopNav.js')

afterEach(cleanup)

describe('StorefrontTopNav account/sign-in menu reachability', () => {
  it('renders the sign-in menu entry point WITHOUT a profileImageUrl (default avatar icon)', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'Bazaar',
        isAuthenticated: false,
        unauthedMenu: [
          { to: '/login', label: 'Sign in', dataMolId: 'nav-login' },
          { to: '/signup', label: 'Create account', dataMolId: 'nav-signup' },
        ],
      }),
    )

    const trigger = container.querySelector('[data-mol-id="profile-trigger-01"]')
    expect(trigger).not.toBeNull()
    // no avatar image, but a default avatar icon fallback is present
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-icon="person"]')).not.toBeNull()

    // the menu is genuinely reachable: opening it reveals the sign-in links
    fireEvent.click(trigger as Element)
    expect(screen.getByText('Sign in')).toBeTruthy()
    expect(screen.getByText('Create account')).toBeTruthy()
  })

  it('falls back to initials when profileInitials is set and no image', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'B',
        isAuthenticated: true,
        profileInitials: 'JD',
        authedMenu: [{ to: '/settings', label: 'My Account' }],
      }),
    )

    expect(container.querySelector('[data-mol-id="profile-trigger-01"]')).not.toBeNull()
    expect(screen.getByText('JD')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('still renders the avatar image when profileImageUrl is present', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'B',
        isAuthenticated: true,
        profileImageUrl: '/me.png',
        profileImageAlt: 'Me',
        authedMenu: [{ to: '/settings', label: 'My Account' }],
      }),
    )

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('/me.png')
    // entry point is still present alongside the avatar
    expect(container.querySelector('[data-mol-id="profile-trigger-01"]')).not.toBeNull()
  })

  it('opens the authed account menu (My Account + Sign Out) when signed in', () => {
    const { container } = render(
      createElement(StorefrontTopNav, {
        brand: 'B',
        isAuthenticated: true,
        authedMenu: [{ to: '/settings', label: 'My Account' }],
        onSignOut: () => {},
      }),
    )

    fireEvent.click(container.querySelector('[data-mol-id="profile-trigger-01"]') as Element)
    expect(screen.getByText('My Account')).toBeTruthy()
    expect(container.querySelector('[data-mol-id="profile-link-signout"]')).not.toBeNull()
  })
})
