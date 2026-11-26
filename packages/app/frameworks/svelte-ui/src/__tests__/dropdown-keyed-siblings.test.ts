// @vitest-environment jsdom
/**
 * Where a `Dropdown` sits among nodes Svelte placed: its trigger snippet
 * spreads the menu-button props on its own element, so the Dropdown renders
 * nothing of its own around it and moves no node Svelte placed. With that, the
 * `{#if}` that renders a Dropdown empties properly, a keyed sibling inserted
 * before one appears, and a swap keeps the rows in order — the placement
 * React's `cloneElement` gives them because it never removes a rendered node.
 *
 * Probe S4 in `.experiments/reviews/svelte-solid-placement/svelte-probes`.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import type { Writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The route location shape the mocked `useLocation` exposes. */
interface RouteLocation {
  pathname: string
  search: string
}

/** The mutable location the mocked `useLocation` returns. */
let routeStore: Writable<RouteLocation>

vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { writable } = await import('svelte/store')
  routeStore = writable<RouteLocation>({ pathname: '/', search: '' })
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useLocation: () => routeStore,
  }
})

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { default: DropdownKeyedHost } = await import('./DropdownKeyedHost.svelte')

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null

/**
 * The `data-p` values of the buttons inside one section.
 *
 * @param section - The section's `data-p` value.
 * @returns The buttons' `data-p` values, in document order.
 */
function buttonsIn(section: string): string[] {
  return Array.from(document.querySelectorAll(`[data-p="${section}"] button`)).map(
    (button) => (button as HTMLElement).dataset.p ?? '',
  )
}

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  document.body.innerHTML = ''
  routeStore.set({ pathname: '/', search: '' })
})

describe('Dropdown placement among keyed siblings', () => {
  it('removes the trigger with the branch that rendered it', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    instance = mount(DropdownKeyedHost, { target: host }) as Record<string, unknown>
    flushSync()
    expect(document.querySelector('[data-p="trigger"]')).not.toBeNull()

    ;(instance as { setShow(v: boolean): void }).setShow(false)
    flushSync()

    expect(document.querySelector('[data-p="trigger"]')).toBeNull()
    expect(host.querySelector('[data-p="branch"]')?.children.length).toBe(0)
  })

  it('renders a row inserted between two others in its own wrapper', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    instance = mount(DropdownKeyedHost, {
      target: host,
      props: { rows: ['r1', 'r2'] },
    }) as Record<string, unknown>
    flushSync()
    expect(buttonsIn('rows')).toEqual(['r1', 'r2'])

    ;(instance as { setRows(v: string[]): void }).setRows(['r1', 'r0', 'r2'])
    flushSync()

    expect(buttonsIn('rows')).toEqual(['r1', 'r0', 'r2'])
  })

  it('keeps the keyed order when two rows swap', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    instance = mount(DropdownKeyedHost, {
      target: host,
      props: { rows: ['r0', 'r1'] },
    }) as Record<string, unknown>
    flushSync()

    ;(instance as { setRows(v: string[]): void }).setRows(['r1', 'r0'])
    flushSync()

    expect(buttonsIn('rows')).toEqual(['r1', 'r0'])
    // No stray host element left where a row used to be.
    expect(host.querySelectorAll('[data-p="rows"] > div')).toHaveLength(0)
  })
})
