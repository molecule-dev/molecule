// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `AnalyticsRouteListener` — a port of
 * `@molecule/app-analytics-react/src/__tests__/analytics.test.tsx`: the same
 * behavioral assertions, rendered with Svelte 5 in jsdom over a real memory
 * router and asserted on the calls the mocked analytics bond receives.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `page` is mocked so tests can inspect and count the listener's calls.
const { mockPage } = vi.hoisted(() => ({
  mockPage: vi.fn(),
}))

vi.mock('@molecule/app-analytics', () => ({ page: mockPage }))

import { createMemoryRouter } from '@molecule/app-routing'

import { AnalyticsRouteListener } from '../components.js'
import Host from './Host.svelte'

/** The mounted hosts, unmounted after each test. */
const instances: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  mockPage.mockClear()
  document.body.innerHTML = ''
})

/** A mounted listener over one memory router. */
interface Mounted {
  /** The element the component mounted into. */
  readonly host: HTMLElement
  /** Navigates the router, as a link elsewhere in the app would. */
  navigate(to: string): Promise<void>
  /** Unmounts the component. */
  unmount(): Promise<void>
}

/**
 * Mounts the listener inside the molecule context's router scope at `initialRoute`.
 *
 * @param initialRoute - The memory router's initial entry.
 * @returns The mounted listener.
 */
const mountListener = (initialRoute: string): Mounted => {
  const router = createMemoryRouter({ initialEntries: [initialRoute], routes: [] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: { router, component: AnalyticsRouteListener },
  })
  instances.push(instance)
  flushSync()
  return {
    host,
    navigate: async (to) => {
      router.navigate(to)
      flushSync()
    },
    unmount: async () => {
      await unmount(instance)
      instances.splice(instances.indexOf(instance), 1)
    },
  }
}

describe('AnalyticsRouteListener', () => {
  it('renders nothing into the DOM', () => {
    const mounted = mountListener('/home')
    expect(mounted.host.querySelectorAll('*').length).toBe(0)
    mounted.unmount()
  })

  it('records a page view with the current pathname + search on mount', () => {
    const mounted = mountListener('/dashboard?tab=1')
    expect(mockPage).toHaveBeenCalledTimes(1)
    expect(mockPage).toHaveBeenCalledWith(
      expect.objectContaining({ name: '/dashboard', path: '/dashboard?tab=1' }),
    )
    mounted.unmount()
  })

  it('records a fresh page view when the route changes', () => {
    const mounted = mountListener('/a')
    expect(mockPage).toHaveBeenCalledTimes(1)

    mounted.navigate('/b')
    expect(mockPage).toHaveBeenCalledTimes(2)
    expect(mockPage).toHaveBeenLastCalledWith(expect.objectContaining({ name: '/b', path: '/b' }))
    mounted.unmount()
  })

  it('does not re-record when the route is unchanged across renders', async () => {
    const mounted = mountListener('/same')
    expect(mockPage).toHaveBeenCalledTimes(1)

    // Navigations that change neither the pathname nor the search do not record again.
    await mounted.navigate('/same')
    await mounted.navigate('/same')
    expect(mockPage).toHaveBeenCalledTimes(1)
    mounted.unmount()
  })
})
