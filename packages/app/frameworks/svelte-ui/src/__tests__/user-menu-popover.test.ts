// @vitest-environment jsdom
/**
 * Render tests for the `UserMenuPopover` inline-popover account-menu family,
 * ported from `@molecule/app-ui-react/src/__tests__/user-menu-popover.test.tsx`:
 * the trigger toggles the panel, the panel renders identity + children only
 * while open, sign-out closes + logs out, and the popover auto-dismisses on
 * route change.
 *
 * The framework differences: React's `useAuth`/`useLocation` hooks become the
 * Svelte binding's stores, so a navigation is a store update (not a React
 * `rerender`), and the JSX tree becomes a small host component composed from
 * the same four named exports.
 *
 * @module
 */
import { fireEvent, screen } from '@testing-library/dom'
import { flushSync, mount, tick, unmount } from 'svelte'
import type { Writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The account fields the popover reads off the auth user. */
interface AccountUser {
  name?: string | null
  email?: string | null
}

/** The session state the mocked `useAuth` exposes. */
interface AuthSnapshot {
  status: string
  user: AccountUser | null
}

/** The route location shape the mocked `useLocation` exposes. */
interface RouteLocation {
  pathname: string
  search: string
  hash: string
}

/** The account the tests sign in by default. */
const DEFAULT_USER: AccountUser = { name: 'Ada Lovelace', email: 'ada@example.com' }

/** The session store the mocked `useAuth` returns; tests advance it. */
let authStore: Writable<AuthSnapshot>
/** The route store the mocked `useLocation` returns; tests advance it. */
let routeStore: Writable<RouteLocation>
/** The auth client's `logout`, spied by the sign-out test. */
let logout: ReturnType<typeof vi.fn<() => Promise<void>>>

vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { writable } = await import('svelte/store')
  authStore = writable<AuthSnapshot>({
    status: 'authenticated',
    user: { name: 'Ada Lovelace', email: 'ada@example.com' },
  })
  routeStore = writable<RouteLocation>({ pathname: '/', search: '', hash: '' })
  logout = vi.fn<() => Promise<void>>(() => Promise.resolve())
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useAuth: () => ({ state: authStore }),
    useAuthClient: () => ({ logout }),
    useLocation: () => routeStore,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
  }
})

// getClassMap() → a Proxy: `cn(...)` joins truthy strings, every other access
// yields a callable that stringifies to its key.
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

const { default: UserMenuPopoverHost } = await import('./UserMenuPopoverHost.svelte')

/** Props for the popover host. */
interface UserMenuPopoverHostProps {
  guestName?: string
  withSignOut?: boolean
  withClosingLink?: boolean
}

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  authStore.set({ status: 'authenticated', user: { ...DEFAULT_USER } })
  routeStore.set({ pathname: '/', search: '', hash: '' })
  logout.mockClear()
})

/**
 * Flushes the queued component updates and their effects.
 *
 * @returns A promise resolved once the flush has run.
 */
async function flush(): Promise<void> {
  await tick()
  flushSync()
}

/**
 * Mounts the popover host and lets its mount effects settle before a test
 * clicks, the way a user's click arrives after mount.
 *
 * @param props - The guest label and which nav children to compose.
 */
async function mountPopover(props: UserMenuPopoverHostProps = {}): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(UserMenuPopoverHost, { target: host, props }))
  flushSync()
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('UserMenuPopoverTrigger', () => {
  it('renders the initials, display name, and email and toggles the panel', async () => {
    await mountPopover()
    // Trigger shows resolved identity; panel is closed initially.
    expect(screen.getByText('AL')).toBeDefined()
    expect(screen.getByText('Ada Lovelace')).toBeDefined()
    expect(screen.getByText('ada@example.com')).toBeDefined()
    expect(screen.queryByText('Settings')).toBeNull()
    // Open it.
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    await flush()
    expect(screen.getByText('Settings')).toBeDefined()
    // Toggle closed again.
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    await flush()
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('falls back to the guest label when there is no auth user', async () => {
    authStore.set({ status: 'authenticated', user: null })
    await mountPopover({ guestName: 'Analyst' })
    expect(screen.getByText('Analyst')).toBeDefined()
  })
})

describe('UserMenuPopoverPanel', () => {
  it('renders the identity header and nav children only while open', async () => {
    await mountPopover({ withSignOut: true })
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    await flush()
    // The panel is a disclosure (a plain toggled region), not role="menu" —
    // it renders a header + a `<nav>` of arbitrary links, which is invalid
    // content for role="menu" (that role may contain ONLY menuitem
    // descendants). The nav landmark is still there, correctly labelled.
    expect(screen.getByRole('navigation', { name: 'Account menu' })).toBeDefined()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByText('Settings')).toBeDefined()
    expect(screen.getByText('Sign out')).toBeDefined()
  })

  it('is linked to the trigger via aria-expanded + aria-controls (not aria-haspopup="menu")', async () => {
    await mountPopover()
    const trigger = screen.getByRole('button', { name: 'Open user menu' })
    expect(trigger.getAttribute('aria-haspopup')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    fireEvent.click(trigger)
    await flush()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // The referenced id resolves to the actual rendered panel.
    expect(document.getElementById(controlsId as string)).toBe(
      screen.getByRole('navigation', { name: 'Account menu' }).parentElement,
    )
  })
})

describe('UserMenuPopoverSignOut', () => {
  it('closes the panel and calls auth.logout', async () => {
    await mountPopover({ withSignOut: true })
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    await flush()
    fireEvent.click(screen.getByText('Sign out'))
    await flush()
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.queryByText('Sign out')).toBeNull()
  })
})

describe('UserMenuPopover — close on route change', () => {
  it('dismisses the open panel when the route changes', async () => {
    await mountPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    await flush()
    expect(screen.getByText('Settings')).toBeDefined()
    routeStore.set({ pathname: '/dashboard', search: '', hash: '' })
    await flush()
    expect(screen.queryByText('Settings')).toBeNull()
  })
})

describe('useUserMenuPopoverClose', () => {
  it('lets a nav child close the popover', async () => {
    await mountPopover({ withClosingLink: true })
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    await flush()
    expect(screen.getByText('go')).toBeDefined()
    fireEvent.click(screen.getByText('go'))
    await flush()
    expect(screen.queryByText('go')).toBeNull()
  })
})
