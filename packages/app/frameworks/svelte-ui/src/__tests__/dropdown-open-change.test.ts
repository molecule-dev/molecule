// @vitest-environment jsdom
/**
 * `Dropdown`'s `onOpenChange` contract with an owner that follows it (the
 * usual controlled wiring, `open={open} onOpenChange={setOpen}`): the menu
 * reports a change only when one happens (a toggle, a selection, Escape, a
 * route change), so an owner that follows every report keeps the menu open
 * until something closes it.
 *
 * Port of `@molecule/app-ui-react/src/__tests__/dropdown-open-change.test.tsx`.
 *
 * @module
 */
import { type Writable, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The route location shape the mocked `useLocation` exposes. */
interface RouteLocation {
  pathname: string
  search: string
}

/** The mutable location the mocked `useLocation` returns; tests advance it. */
let routeStore: Writable<RouteLocation>

vi.mock('@molecule/app-svelte', async () => {
  const { writable } = await import('svelte/store')
  routeStore = writable<RouteLocation>({ pathname: '/', search: '' })
  return { useLocation: () => routeStore }
})

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
          }
          const token = String(prop)
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

import { fireEvent, screen } from '@testing-library/dom'
import { type ComponentProps, flushSync, mount, tick, unmount } from 'svelte'

const { default: DropdownOwnerHost } = await import('./DropdownOwnerHost.svelte')

const ITEMS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
]

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  routeStore.set({ pathname: '/', search: '' })
})

/**
 * Mounts the owner host and waits for the Dropdown's mount effects.
 *
 * @param props - The host props.
 * @returns The mount host.
 */
async function renderOwner(props: ComponentProps<typeof DropdownOwnerHost>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(DropdownOwnerHost, { target: host, props }))
  flushSync()
  await tick()
  return host
}

describe('Dropdown onOpenChange with an owner that follows it', () => {
  it('keeps a menu mounted open open, and reports nothing on mount', async () => {
    const onReport = vi.fn()
    const open = writable(true)
    await renderOwner({
      open,
      items: ITEMS,
      onOpenChange: (next: boolean) => {
        onReport(next)
        open.set(next)
      },
    })

    expect(screen.getByRole('menu')).toBeDefined()
    expect(onReport).not.toHaveBeenCalled()
  })

  it('keeps a menu opened by the trigger open', async () => {
    const onReport = vi.fn()
    const open = writable(false)
    await renderOwner({
      open,
      items: ITEMS,
      onOpenChange: (next: boolean) => {
        onReport(next)
        open.set(next)
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Options' }))
    flushSync()

    expect(screen.getByRole('menu')).toBeDefined()
    expect(onReport.mock.calls).toEqual([[true]])
  })

  it('closes through onOpenChange when the route changes', async () => {
    const onReport = vi.fn()
    const open = writable(false)
    await renderOwner({
      open,
      items: ITEMS,
      onOpenChange: (next: boolean) => {
        onReport(next)
        open.set(next)
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Options' }))
    flushSync()

    routeStore.set({ pathname: '/settings', search: '' })
    await tick()
    flushSync()

    expect(screen.queryByRole('menu')).toBeNull()
    expect(onReport.mock.calls).toEqual([[true], [false]])
  })
})

describe('uncontrolled Dropdown onOpenChange', () => {
  it('reports nothing on mount, then each toggle and the route-change close', async () => {
    const onOpenChange = vi.fn()
    await renderOwner({ items: ITEMS, onOpenChange })
    expect(onOpenChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Options' }))
    flushSync()
    expect(screen.getByRole('menu')).toBeDefined()

    routeStore.set({ pathname: '/', search: '?tab=2' })
    await tick()
    flushSync()

    expect(screen.queryByRole('menu')).toBeNull()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })
})
