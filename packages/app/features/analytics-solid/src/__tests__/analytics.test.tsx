// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AnalyticsRouteListener` — a port of
 * `@molecule/app-analytics-react/src/__tests__/analytics.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom over a real memory
 * router and asserted on the calls the mocked analytics bond receives.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `page` is mocked so tests can inspect and count the listener's calls.
const { mockPage } = vi.hoisted(() => ({
  mockPage: vi.fn(),
}))

vi.mock('@molecule/app-analytics', () => ({ page: mockPage }))

import { createMemoryRouter } from '@molecule/app-routing'
import { MoleculeProvider } from '@molecule/app-solid'

import { AnalyticsRouteListener } from '../AnalyticsRouteListener.jsx'

afterEach(() => {
  mockPage.mockClear()
  document.body.innerHTML = ''
})

/** A mounted listener over one memory router. */
interface Mounted {
  /** The element the renderer mounted into. */
  readonly host: HTMLElement
  /** Lets pending effects settle, as the end of a render batch would. */
  settle(): Promise<void>
  /** Navigates the router, as a link elsewhere in the app would. */
  navigate(to: string): Promise<void>
  /** Disposes the render. */
  unmount(): void
}

/**
 * Mounts the listener inside a `MoleculeProvider` with `router` at `initialRoute`.
 *
 * @param initialRoute - The memory router's initial entry.
 * @returns The mounted listener.
 */
const mountListener = (initialRoute: string): Mounted => {
  const router = createMemoryRouter({ initialEntries: [initialRoute], routes: [] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const dispose = render(
    () => (
      <MoleculeProvider router={router}>
        <AnalyticsRouteListener />
      </MoleculeProvider>
    ),
    host,
  )
  return {
    host,
    settle: async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
    navigate: async (to) => {
      router.navigate(to)
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
    unmount: () => {
      dispose()
    },
  }
}

describe('AnalyticsRouteListener', () => {
  it('renders nothing into the DOM', async () => {
    const mounted = mountListener('/home')
    await mounted.settle()
    expect(mounted.host.querySelectorAll('*').length).toBe(0)
    mounted.unmount()
  })

  it('records a page view with the current pathname + search on mount', async () => {
    const mounted = mountListener('/dashboard?tab=1')
    await mounted.settle()
    expect(mockPage).toHaveBeenCalledTimes(1)
    expect(mockPage).toHaveBeenCalledWith(
      expect.objectContaining({ name: '/dashboard', path: '/dashboard?tab=1' }),
    )
    mounted.unmount()
  })

  it('records a fresh page view when the route changes', async () => {
    const mounted = mountListener('/a')
    await mounted.settle()
    expect(mockPage).toHaveBeenCalledTimes(1)

    await mounted.navigate('/b')
    expect(mockPage).toHaveBeenCalledTimes(2)
    expect(mockPage).toHaveBeenLastCalledWith(expect.objectContaining({ name: '/b', path: '/b' }))
    mounted.unmount()
  })

  it('does not re-record when the route is unchanged across renders', async () => {
    const mounted = mountListener('/same')
    await mounted.settle()
    expect(mockPage).toHaveBeenCalledTimes(1)

    // Navigations that change neither the pathname nor the search do not record again.
    await mounted.navigate('/same')
    await mounted.navigate('/same')
    expect(mockPage).toHaveBeenCalledTimes(1)
    mounted.unmount()
  })
})
