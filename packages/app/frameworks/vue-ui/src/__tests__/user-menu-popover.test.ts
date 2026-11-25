// @vitest-environment jsdom
/**
 * Render tests for the `UserMenuPopover` inline-popover account-menu family:
 * trigger toggles the panel, the panel renders identity + children only
 * while open, sign-out closes + logs out, and the popover auto-dismisses on
 * route change. Vue port of
 * `@molecule/app-ui-react/src/__tests__/user-menu-popover.test.tsx`.
 *
 * @module
 */
import { type BoundFunctions, type queries, within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The auth user fields the popover resolves its identity from. */
interface AccountUser {
  name?: string | null
  email?: string | null
}

// A reactive location the mocked `useLocation` returns — tests replace it to
// simulate SPA navigation, and Vue reactivity re-renders the popover.
const { location, authUser, user, logout } = await vi.hoisted(async () => {
  const { computed, shallowRef } = await import('vue')
  const authUser = shallowRef<AccountUser | null>({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  })
  return {
    location: shallowRef<{ pathname: string; search: string; hash: string }>({
      pathname: '/',
      search: '',
      hash: '',
    }),
    authUser,
    user: computed(() => authUser.value),
    logout: vi.fn(() => Promise.resolve()),
  }
})

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => location,
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useAuth: () => ({ user, logout }),
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

import { type App, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

const {
  UserMenuPopover,
  UserMenuPopoverTrigger,
  UserMenuPopoverPanel,
  UserMenuPopoverSignOut,
  useUserMenuPopoverClose,
} = await import('../components/UserMenuPopover.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  location.value = { pathname: '/', search: '', hash: '' }
  authUser.value = { name: 'Ada Lovelace', email: 'ada@example.com' }
  logout.mockClear()
})

/**
 * Mounts a render function into a fresh host, the way the package's other
 * Vue tests do.
 *
 * @param render - The component render.
 */
function mount(render: () => VNodeChild): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
}

const body = (): BoundFunctions<typeof queries> => within(document.body)

/**
 * Mounts the compose-as-documented popover: a trigger plus a panel holding
 * the given nav children.
 *
 * @param props - The popover props (`guestName`, …).
 * @param panelChildren - The panel's nav children.
 */
function mountPopover(props: { guestName?: string }, panelChildren: () => VNodeChild[]): void {
  mount(() =>
    h(UserMenuPopover, props, {
      default: () => [
        h(UserMenuPopoverTrigger),
        h(UserMenuPopoverPanel, null, { default: panelChildren }),
      ],
    }),
  )
}

describe('UserMenuPopoverTrigger', () => {
  it('renders the initials, display name, and email and toggles the panel', async () => {
    mountPopover({}, () => [h('a', { href: '/settings' }, 'Settings')])
    // Trigger shows resolved identity; panel is closed initially.
    expect(body().getByText('AL')).toBeDefined()
    expect(body().getByText('Ada Lovelace')).toBeDefined()
    expect(body().getByText('ada@example.com')).toBeDefined()
    expect(body().queryByText('Settings')).toBeNull()
    // Open it.
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    expect(body().getByText('Settings')).toBeDefined()
    // Toggle closed again.
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    expect(body().queryByText('Settings')).toBeNull()
  })

  it('falls back to the guest label when there is no auth user', async () => {
    authUser.value = null
    mountPopover({ guestName: 'Analyst' }, () => ['x'])
    await nextTick()
    expect(body().getByText('Analyst')).toBeDefined()
  })
})

describe('UserMenuPopoverPanel', () => {
  it('renders the identity header and nav children only while open', async () => {
    mountPopover({}, () => [h('a', { href: '/settings' }, 'Settings'), h(UserMenuPopoverSignOut)])
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    // The panel is a disclosure (a plain toggled region), not role="menu" —
    // it renders a header + a `<nav>` of arbitrary links, which is invalid
    // content for role="menu" (that role may contain ONLY menuitem
    // descendants). The nav landmark is still there, correctly labelled.
    expect(body().getByRole('navigation', { name: 'Account menu' })).toBeDefined()
    expect(body().queryByRole('menu')).toBeNull()
    expect(body().getByText('Settings')).toBeDefined()
    expect(body().getByText('Sign out')).toBeDefined()
  })

  it('is linked to the trigger via aria-expanded + aria-controls (not aria-haspopup="menu")', async () => {
    mountPopover({}, () => [h('a', { href: '/settings' }, 'Settings')])
    const trigger = body().getByRole('button', { name: 'Open user menu' })
    expect(trigger.getAttribute('aria-haspopup')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    trigger.click()
    await nextTick()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // The referenced id resolves to the actual rendered panel.
    expect(document.getElementById(controlsId as string)).toBe(
      body().getByRole('navigation', { name: 'Account menu' }).parentElement,
    )
  })
})

describe('UserMenuPopoverSignOut', () => {
  it('closes the panel and calls auth.logout', async () => {
    mountPopover({}, () => [h(UserMenuPopoverSignOut)])
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    body().getByText('Sign out').click()
    await nextTick()
    expect(logout).toHaveBeenCalledOnce()
    expect(body().queryByText('Sign out')).toBeNull()
  })
})

describe('UserMenuPopover — close on route change', () => {
  it('dismisses the open panel when the route changes', async () => {
    mountPopover({}, () => [h('a', { href: '/settings' }, 'Settings')])
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    expect(body().getByText('Settings')).toBeDefined()
    location.value = { pathname: '/dashboard', search: '', hash: '' }
    await nextTick()
    expect(body().queryByText('Settings')).toBeNull()
  })
})

describe('useUserMenuPopoverClose', () => {
  it('lets a nav child close the popover', async () => {
    /** A nav child that closes the popover when clicked. */
    const ClosingLink = defineComponent({
      name: 'ClosingLink',
      setup() {
        const close = useUserMenuPopoverClose()
        return () => h('button', { type: 'button', onClick: close }, 'go')
      },
    })
    mountPopover({}, () => [h(ClosingLink)])
    body().getByRole('button', { name: 'Open user menu' }).click()
    await nextTick()
    expect(body().getByText('go')).toBeDefined()
    body().getByText('go').click()
    await nextTick()
    expect(body().queryByText('go')).toBeNull()
  })
})
