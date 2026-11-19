// @vitest-environment jsdom
/**
 * Render tests for the `UserMenuPopover` inline-popover account-menu family:
 * trigger toggles the panel, the panel renders identity + children only while
 * open, sign-out closes + logs out, and the popover auto-dismisses on route
 * change.
 *
 * Solid counterpart of `@molecule/app-ui-react`'s `user-menu-popover` test:
 * the mocked `useLocation` and `useAuth` read reactive accessors, so a
 * navigation is a signal write instead of React's `rerender`.
 *
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** A user shape the mocked `useAuth` returns. */
interface AccountUser {
  name?: string
  email?: string
}

const auth = vi.hoisted(() => ({
  state: {
    user: { name: 'Ada Lovelace', email: 'ada@example.com' } as AccountUser | null,
  },
  logout: vi.fn(() => Promise.resolve()),
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

// The mocked `useLocation` reads the same reactive location the tests change,
// and `useAuth` exposes the mutable identity + the logout spy.
vi.mock('@molecule/app-solid', async () => {
  const { overlayLocation } = await import('./overlay-location-fixture.js')
  return {
    useLocation: () => overlayLocation,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
    useAuth: () => ({ user: () => auth.state.user, logout: auth.logout }),
  }
})

import { setOverlayLocation } from './overlay-location-fixture.js'

const {
  UserMenuPopover,
  UserMenuPopoverTrigger,
  UserMenuPopoverPanel,
  UserMenuPopoverSignOut,
  useUserMenuPopoverClose,
} = await import('../components/UserMenuPopover.jsx')

const disposers: Array<() => void> = []

/** Mounts JSX into a fresh container and registers its disposer. */
function mount(jsx: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(jsx, container))
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  setOverlayLocation({ pathname: '/', search: '' })
  auth.state.user = { name: 'Ada Lovelace', email: 'ada@example.com' }
  auth.logout.mockClear()
})

describe('UserMenuPopoverTrigger', () => {
  it('renders the initials, display name, and email and toggles the panel', () => {
    mount(() => (
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
        </UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    // Trigger shows resolved identity; panel is closed initially.
    expect(within(document.body).getByText('AL')).toBeDefined()
    expect(within(document.body).getByText('Ada Lovelace')).toBeDefined()
    expect(within(document.body).getByText('ada@example.com')).toBeDefined()
    expect(within(document.body).queryByText('Settings')).toBeNull()
    // Open it.
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    expect(within(document.body).getByText('Settings')).toBeDefined()
    // Toggle closed again.
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    expect(within(document.body).queryByText('Settings')).toBeNull()
  })

  it('falls back to the guest label when there is no auth user', () => {
    auth.state.user = null
    mount(() => (
      <UserMenuPopover guestName="Analyst">
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>x</UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    expect(within(document.body).getByText('Analyst')).toBeDefined()
  })
})

describe('UserMenuPopoverPanel', () => {
  it('renders the identity header and nav children only while open', () => {
    mount(() => (
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
          <UserMenuPopoverSignOut />
        </UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    // The panel is a disclosure (a plain toggled region), not role="menu" —
    // it renders a header + a `<nav>` of arbitrary links. The nav landmark
    // is still there, correctly labelled.
    expect(within(document.body).getByRole('navigation', { name: 'Account menu' })).toBeDefined()
    expect(within(document.body).queryByRole('menu')).toBeNull()
    expect(within(document.body).getByText('Settings')).toBeDefined()
    expect(within(document.body).getByText('Sign out')).toBeDefined()
  })

  it('is linked to the trigger via aria-expanded + aria-controls (not aria-haspopup="menu")', () => {
    mount(() => (
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
        </UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    const trigger = within(document.body).getByRole('button', { name: 'Open user menu' })
    expect(trigger.getAttribute('aria-haspopup')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // The referenced id resolves to the actual rendered panel.
    expect(document.getElementById(controlsId as string)).toBe(
      within(document.body).getByRole('navigation', { name: 'Account menu' }).parentElement,
    )
  })
})

describe('UserMenuPopoverSignOut', () => {
  it('closes the panel and calls auth.logout', async () => {
    mount(() => (
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <UserMenuPopoverSignOut />
        </UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    fireEvent.click(within(document.body).getByText('Sign out'))
    expect(auth.logout).toHaveBeenCalledOnce()
    expect(within(document.body).queryByText('Sign out')).toBeNull()
  })
})

describe('UserMenuPopover — close on route change', () => {
  it('dismisses the open panel when the route changes', () => {
    mount(() => (
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <a href="/settings">Settings</a>
        </UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    expect(within(document.body).getByText('Settings')).toBeDefined()
    setOverlayLocation({ pathname: '/dashboard', search: '' })
    expect(within(document.body).queryByText('Settings')).toBeNull()
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
    mount(() => (
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>
          <ClosingLink />
        </UserMenuPopoverPanel>
      </UserMenuPopover>
    ))
    fireEvent.click(within(document.body).getByRole('button', { name: 'Open user menu' }))
    expect(within(document.body).getByText('go')).toBeDefined()
    fireEvent.click(within(document.body).getByText('go'))
    expect(within(document.body).queryByText('go')).toBeNull()
  })
})
