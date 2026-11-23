// @vitest-environment jsdom
/**
 * Unit tests of `AnalyticsRouteListener` — the port of
 * `@molecule/app-analytics-react/src/__tests__/analytics.test.tsx`. The React
 * suite renders the component with a mocked router and asserts the mocked
 * analytics bond's calls; this port mounts the same mocked tree through
 * Angular's real renderer over a real memory router (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same calls.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `page` is mocked so tests can inspect and count the listener's calls.
const { mockPage } = vi.hoisted(() => ({
  mockPage: vi.fn(),
}))

vi.mock('@molecule/app-analytics', () => ({ page: mockPage }))

import { provideDomPlacement, provideRouter } from '@molecule/app-angular'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

const { AnalyticsRouteListener } = await import('../analytics-route-listener.component.js')

/** A mounted listener over one memory router. */
interface Mounted {
  /** The host element whose template the component's host element lives in. */
  readonly host: HTMLElement
  /** The memory router the listener follows. */
  readonly router: Router
  /** Flushes change detection, as Angular does after any asynchronous work. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the listener through a JIT host template inside the router
 * registration's scope.
 *
 * @param initialRoute - The memory router's initial entry.
 * @param template - The host template (defaults to a lone listener).
 * @returns The mounted listener.
 */
const mountListener = async (
  initialRoute: string,
  template = `<mol-analytics-route-listener />`,
): Promise<Mounted> => {
  const router = createMemoryRouter({ initialEntries: [initialRoute], routes: [] })
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AnalyticsRouteListener as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = {}
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    router,
    tick: () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

afterEach(() => {
  mockPage.mockClear()
})

describe('AnalyticsRouteListener', () => {
  it('renders nothing into the DOM', async () => {
    // React returns null: the host is not merely empty, it is absent from the page.
    const mounted = await mountListener('/home')
    const el = mounted.host.querySelector('mol-analytics-route-listener')
    expect(el).toBeNull()
    // Only Angular's block placeholder comment is left.
    expect(mounted.host.children.length).toBe(0)
    expect(mounted.host.textContent).toBe('')
    await mounted.destroy()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const mounted = await mountListener('/home', `<i>a</i><mol-analytics-route-listener /><i>b</i>`)
    const tags = Array.from(mounted.host.children).map((el) => el.tagName.toLowerCase())
    expect(tags).toEqual(['i', 'i'])
    expect(mounted.host.querySelector('mol-analytics-route-listener')).toBeNull()
    await mounted.destroy()
  })

  it('records a page view with the current pathname + search on mount', async () => {
    const mounted = await mountListener('/dashboard?tab=1')
    expect(mockPage).toHaveBeenCalledTimes(1)
    expect(mockPage).toHaveBeenCalledWith(
      expect.objectContaining({ name: '/dashboard', path: '/dashboard?tab=1' }),
    )
    await mounted.destroy()
  })

  it('records a fresh page view when the route changes', async () => {
    const mounted = await mountListener('/a')
    expect(mockPage).toHaveBeenCalledTimes(1)

    mounted.router.navigate('/b')
    mounted.tick()
    expect(mockPage).toHaveBeenCalledTimes(2)
    expect(mockPage).toHaveBeenLastCalledWith(expect.objectContaining({ name: '/b', path: '/b' }))
    await mounted.destroy()
  })

  it('does not re-record when the route is unchanged across renders', async () => {
    const mounted = await mountListener('/same')
    expect(mockPage).toHaveBeenCalledTimes(1)

    // Navigations that change neither the pathname nor the search do not record again.
    mounted.router.navigate('/same')
    mounted.tick()
    mounted.router.navigate('/same')
    mounted.tick()
    expect(mockPage).toHaveBeenCalledTimes(1)
    await mounted.destroy()
  })
})
