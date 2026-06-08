// @vitest-environment jsdom
/**
 * Render tests for the `UserMenuPopover` inline-popover account-menu
 * family: trigger toggles the panel, the panel renders identity +
 * children only while open, sign-out closes + logs out, and the popover
 * auto-dismisses on route change.
 *
 * @module
 */
import { fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable location the mocked `useLocation` returns — tests advance it
// to simulate SPA navigation, then re-render.
const mockLocation = { pathname: '/', search: '', hash: '' }

// A mutable auth state the mocked `useAuth` returns.
const logout = vi.fn(() => Promise.resolve())
const mockAuth: { user: { name?: string; email?: string } | null } = {
  user: { name: 'Ada Lovelace', email: 'ada@example.com' },
}

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ ...mockLocation }),
}))

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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useAuth: () => ({ user: mockAuth.user, logout }),
}))

const {
  UserMenuPopover,
  UserMenuPopoverTrigger,
  UserMenuPopoverPanel,
  UserMenuPopoverSignOut,
  useUserMenuPopoverClose,
} = await import('../components/UserMenuPopover.js')

afterEach(() => {
  mockLocation.pathname = '/'
  mockLocation.search = ''
  mockLocation.hash = ''
  mockAuth.user = { name: 'Ada Lovelace', email: 'ada@example.com' }
  logout.mockClear()
})

describe('UserMenuPopoverTrigger', () => {
  it('renders the initials, display name, and email and toggles the panel', () => {
    render(
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
        </UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    // Trigger shows resolved identity; panel is closed initially.
    expect(screen.getByText('AL')).toBeDefined()
    expect(screen.getByText('Ada Lovelace')).toBeDefined()
    expect(screen.getByText('ada@example.com')).toBeDefined()
    expect(screen.queryByText('Settings')).toBeNull()
    // Open it.
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    expect(screen.getByText('Settings')).toBeDefined()
    // Toggle closed again.
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('falls back to the guest label when there is no auth user', () => {
    mockAuth.user = null
    render(
      <UserMenuPopover guestName="Analyst">
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>x</UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    expect(screen.getByText('Analyst')).toBeDefined()
  })
})

describe('UserMenuPopoverPanel', () => {
  it('renders the identity header and nav children only while open', () => {
    render(
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
          <UserMenuPopoverSignOut />
        </UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    // Identity header + nav children render inside the open panel.
    expect(screen.getByRole('menu')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
    expect(screen.getByText('Sign out')).toBeDefined()
  })
})

describe('UserMenuPopoverSignOut', () => {
  it('closes the panel and calls auth.logout', async () => {
    render(
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <UserMenuPopoverSignOut />
        </UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    fireEvent.click(screen.getByText('Sign out'))
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.queryByText('Sign out')).toBeNull()
  })
})

describe('UserMenuPopover — close on route change', () => {
  it('dismisses the open panel when the route changes', () => {
    const { rerender } = render(
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
        </UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    expect(screen.getByText('Settings')).toBeDefined()
    mockLocation.pathname = '/dashboard'
    rerender(
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
        </UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    expect(screen.queryByText('Settings')).toBeNull()
  })
})

describe('useUserMenuPopoverClose', () => {
  it('lets a nav child close the popover', () => {
    /** A nav child that closes the popover when clicked. */
    function ClosingLink(): JSX.Element {
      const close = useUserMenuPopoverClose()
      return (
        <button type="button" onClick={close}>
          go
        </button>
      )
    }
    render(
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <ClosingLink />
        </UserMenuPopoverPanel>
      </UserMenuPopover>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    expect(screen.getByText('go')).toBeDefined()
    fireEvent.click(screen.getByText('go'))
    expect(screen.queryByText('go')).toBeNull()
  })
})
