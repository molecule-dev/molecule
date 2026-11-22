// @vitest-environment jsdom
/**
 * Close-on-route-change behavior shared by the overlay components
 * (`UserMenu`, `SidebarUserCard`, `Dropdown`): opening the overlay and then
 * changing the route must dismiss it (an overlay left mounted over the next
 * page blocks clicks underneath).
 *
 * Svelte counterpart of `@molecule/app-ui-react`'s `overlay-route-close` test:
 * the mocked `useLocation` is a store the tests write to, so a navigation is a
 * store update instead of React's `rerender`.
 *
 * @module
 */
import { fireEvent, screen } from '@testing-library/dom'
import { flushSync, mount, tick, unmount } from 'svelte'
import type { Writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The route location shape the mocked `useLocation` exposes. */
interface RouteLocation {
  pathname: string
  search: string
}

/** The route store the mocked `useLocation` returns; tests advance it. */
let routeStore: Writable<RouteLocation>

vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { readable, writable } = await import('svelte/store')
  routeStore = writable<RouteLocation>({ pathname: '/', search: '' })
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useLocation: () => routeStore,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    }),
    // SidebarUserCard reads the auth client's state store.
    useAuth: () => ({
      state: readable({
        status: 'authenticated',
        user: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
      }),
    }),
  }
})

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
        // Every other token is a callable that returns its own name —
        // components use both `cm.foo` and `cm.foo({...})` forms.
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { default: OverlayHost } = await import('./OverlayRouteCloseHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

type OverlayHostProps = {
  kind: 'user-menu' | 'sidebar' | 'panel-close' | 'dropdown'
  items?: { label: string; value: string }[]
}

/**
 * Mounts the overlay host and lets its mount effects (including the route
 * effect's first pass) settle before a test clicks, the way a user's click
 * arrives after mount.
 *
 * @param props - The overlay kind and, for the dropdown, its items.
 */
async function mountOverlay(props: OverlayHostProps): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(OverlayHost, { target: host, props }))
  flushSync()
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Applies a mocked navigation the way a route effect observes it. */
async function navigate(pathname: string): Promise<void> {
  routeStore.set({ pathname, search: '' })
  await tick()
  flushSync()
}

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  routeStore.set({ pathname: '/', search: '' })
})

describe('UserMenu — close on route change', () => {
  it('dismisses the open drawer when the route changes', async () => {
    await mountOverlay({ kind: 'user-menu' })
    // Drawer is closed initially.
    expect(screen.queryByText('panel')).toBeNull()
    // Open it.
    fireEvent.click(screen.getByRole('button'))
    flushSync()
    expect(screen.getByText('panel')).toBeDefined()
    // Navigate — the location effect must close the drawer.
    await navigate('/settings')
    expect(screen.queryByText('panel')).toBeNull()
  })
})

describe('SidebarUserCard — close on route change', () => {
  it('dismisses the open drawer when the route changes', async () => {
    await mountOverlay({ kind: 'sidebar' })
    fireEvent.click(screen.getByRole('button'))
    flushSync()
    expect(screen.getByText('sidebar-panel')).toBeDefined()
    await navigate('/profile')
    expect(screen.queryByText('sidebar-panel')).toBeNull()
  })
})

describe('usePanelClose — panel content dismisses its drawer', () => {
  it('lets UserMenu panel children close the drawer via context', async () => {
    await mountOverlay({ kind: 'panel-close' })
    // Open the drawer, then close it from inside the panel.
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    flushSync()
    expect(screen.getByText('dismiss')).toBeDefined()
    fireEvent.click(screen.getByText('dismiss'))
    flushSync()
    expect(screen.queryByText('dismiss')).toBeNull()
  })
})

describe('Dropdown — close on route change', () => {
  it('dismisses the open menu when the route changes', async () => {
    await mountOverlay({ kind: 'dropdown', items: [{ label: 'Item A', value: 'a' }] })
    fireEvent.click(screen.getByText('Open menu'))
    flushSync()
    expect(screen.getByText('Item A')).toBeDefined()
    await navigate('/elsewhere')
    expect(screen.queryByText('Item A')).toBeNull()
  })
})
