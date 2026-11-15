// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AnalyticsRouteListener` — a port of
 * `@molecule/app-analytics-react/src/__tests__/analytics.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom over a real memory router
 * and asserted on the calls the mocked analytics bond receives.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `page` is mocked so tests can inspect and count the listener's calls.
const { mockPage } = vi.hoisted(() => ({
  mockPage: vi.fn(),
}))

vi.mock('@molecule/app-analytics', () => ({ page: mockPage }))

import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { createMemoryRouter } from '@molecule/app-routing'
import { createRouterPlugin } from '@molecule/app-vue'

import { AnalyticsRouteListener } from '../AnalyticsRouteListener.js'

afterEach(() => {
  mockPage.mockClear()
  document.body.innerHTML = ''
})

/** A mounted listener over one memory router. */
interface Mounted {
  /** The element the app mounted into (comment anchors aside, empty). */
  readonly host: HTMLElement
  /** Forces a re-render that changes nothing the listener watches. */
  rerender(): Promise<void>
  /** Navigates the router, as a link elsewhere in the app would. */
  navigate(to: string): Promise<void>
  /** Unmounts the app. */
  unmount(): void
}

/**
 * Mounts the listener inside the router plugin's scope at `initialRoute`.
 *
 * @param initialRoute - The memory router's initial entry.
 * @param withTick - Renders a ticking sibling, so a re-render can be forced
 *   without touching anything the listener watches.
 * @returns The mounted listener.
 */
const mountListener = (initialRoute: string, withTick = false): Mounted => {
  const router = createMemoryRouter({ initialEntries: [initialRoute], routes: [] })
  const tick = ref(0)
  const app = createApp(
    defineComponent({
      setup() {
        return () => [
          ...(withTick ? [h('span', { 'data-tick': tick.value })] : []),
          h(AnalyticsRouteListener),
        ]
      },
    }),
  )
  const host = document.createElement('div')
  document.body.appendChild(host)
  app.use(createRouterPlugin(router))
  app.mount(host)
  return {
    host,
    rerender: async () => {
      tick.value++
      await nextTick()
    },
    navigate: async (to) => {
      router.navigate(to)
      await nextTick()
      await nextTick()
    },
    unmount: () => {
      app.unmount()
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

  it('records a fresh page view when the route changes', async () => {
    const mounted = mountListener('/a')
    expect(mockPage).toHaveBeenCalledTimes(1)

    await mounted.navigate('/b')
    expect(mockPage).toHaveBeenCalledTimes(2)
    expect(mockPage).toHaveBeenLastCalledWith(expect.objectContaining({ name: '/b', path: '/b' }))
    mounted.unmount()
  })

  it('does not re-record when the route is unchanged across renders', async () => {
    const mounted = mountListener('/same', true)
    await mounted.rerender()
    await mounted.rerender()
    expect(mockPage).toHaveBeenCalledTimes(1)
    mounted.unmount()
  })
})
