// @vitest-environment jsdom
/**
 * The Dropdown's trigger-snippet contract: the snippet receives an attachment
 * to spread on its own element, and that element becomes the real menu button
 * — no wrapper, no node moved out of where Svelte rendered it — the way React's
 * `cloneElement` path clones a single-element trigger. A trigger whose root
 * element changes is followed because the attachment runs on the new element.
 * A snippet that does not spread the props falls back to React's
 * `role="button"` container, rendered with the snippet called without props.
 *
 * @module
 */
import { fireEvent, screen } from '@testing-library/dom'
import { type Component, flushSync, mount, unmount } from 'svelte'
import type { Writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DropdownItem } from '../types.js'

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

const { default: DropdownTriggerPropsHost } = await import('./DropdownTriggerPropsHost.svelte')
const { default: DropdownTriggerFallbackHost } =
  await import('./DropdownTriggerFallbackHost.svelte')

/** The one-item menu every case renders. */
const items: DropdownItem[] = [{ label: 'One', value: 'one' }]

/** Mounts alive right now, if any. */
let instance: Record<string, unknown> | null = null
/** The mount host right now, if any. */
let host: HTMLElement | null = null

/**
 * Mounts one host component into a fresh element in the document.
 *
 * @param component - The host to mount.
 * @returns The mounted instance.
 */
function render(component: Component<{ items: DropdownItem[] }>): Record<string, unknown> {
  host = document.createElement('div')
  document.body.appendChild(host)
  const mounted = mount(component, { target: host, props: { items } })
  instance = mounted as unknown as Record<string, unknown>
  flushSync()
  return instance
}

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  routeStore.set({ pathname: '/', search: '' })
})

describe('Dropdown trigger snippet', () => {
  it("renders a trigger snippet's element as the menu button, with no wrapper or moved nodes", () => {
    render(DropdownTriggerPropsHost)

    const button = host!.querySelector('button')
    expect(button).not.toBeNull()
    // The snippet's own element IS the trigger: no wrapper around it, and
    // nothing was moved out of the block Svelte rendered.
    expect(button!.parentElement).toBe(host)
    expect(host!.firstElementChild).toBe(button)
    expect(host!.querySelector('div[role="button"]')).toBeNull()

    expect(button!.getAttribute('aria-haspopup')).toBe('menu')
    expect(button!.getAttribute('aria-expanded')).toBe('false')
    expect(button!.getAttribute('tabindex')).toBe('0')
    // The snippet was handed the props to spread (the contract; before this
    // change the snippet got no argument and the element was adopted by
    // address instead).
    expect(button!.getAttribute('data-snippet-props')).toBe('yes')

    fireEvent.click(button!)
    flushSync()
    expect(screen.getByRole('menu')).toBeDefined()
    expect(button!.getAttribute('aria-expanded')).toBe('true')
    expect(button!.getAttribute('aria-controls')).toBe(screen.getByRole('menu').id)

    // Same element, same handlers: click it closed again.
    fireEvent.click(button!)
    flushSync()
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.keyDown(button!, { key: 'ArrowDown' })
    flushSync()
    expect(screen.getByRole('menu')).toBeDefined()
  })

  it('follows a trigger whose root element changes', () => {
    const mounted = render(DropdownTriggerPropsHost)
    const oldButton = host!.querySelector('button')!
    fireEvent.keyDown(oldButton, { key: 'ArrowDown' })
    flushSync()
    expect(screen.getByRole('menu')).toBeDefined()
    fireEvent.keyDown(document, { key: 'Escape' })
    flushSync()
    expect(screen.queryByRole('menu')).toBeNull()

    ;(mounted as { setUseLink(v: boolean): void }).setUseLink(true)
    flushSync()

    // The old element is gone and the new one is the menu button.
    expect(host!.querySelector('button')).toBeNull()
    const link = host!.querySelector('a')
    expect(link).not.toBeNull()
    expect(link!.parentElement).toBe(host)
    expect(link!.getAttribute('aria-haspopup')).toBe('menu')
    expect(link!.getAttribute('tabindex')).toBe('0')

    fireEvent.click(link!)
    flushSync()
    expect(screen.getByRole('menu')).toBeDefined()
    expect(link!.getAttribute('aria-expanded')).toBe('true')
  })

  it('wraps a snippet that does not spread its props in the role=button fallback', () => {
    render(DropdownTriggerFallbackHost)

    const wrapper = host!.querySelector('div[role="button"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper!.getAttribute('aria-haspopup')).toBe('menu')
    expect(wrapper!.getAttribute('tabindex')).toBe('0')
    // The span is the snippet's own content, rendered inside the fallback.
    expect(wrapper!.querySelector('span')?.textContent).toBe('Menu')
    expect(host!.querySelector('span')?.parentElement).toBe(wrapper)

    fireEvent.click(wrapper!)
    flushSync()
    expect(screen.getByRole('menu')).toBeDefined()
    expect(wrapper!.getAttribute('aria-expanded')).toBe('true')
  })
})
