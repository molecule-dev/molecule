// @vitest-environment jsdom
/**
 * The React bond's `binding-router.test.tsx` titles, carried to the Angular Router bond:
 * `provideMoleculeRouter` gives `@molecule/app-angular` its router and Angular Router's
 * outlet as the routed view. The binding's hooks read the bonded router; `<mol-routed-view />`
 * in a layout route renders the matched child; a provider in a route's `providers` (Angular's
 * provider inside another) uses the outer router; a page reads its route params through
 * `useMoleculeRouter` with no route definitions; and what `useMoleculeRouter` returns shares
 * the bonded router's guards, routes and navigation.
 *
 * React's render is a change detection here: the cases record what each one read.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RoutedView, useLocation, useParams, useRouterInstance } from '@molecule/app-angular'
import { getRouter, type RouteParams, type Router, setRouter } from '@molecule/app-routing'

import { provideMoleculeRouter, useMoleculeRouter } from '../index.js'
import { bootApp, type BootedApp } from './angular-app.js'

const originalBond = getRouter()
let booted: BootedApp | undefined

afterEach(() => {
  booted?.teardown()
  booted = undefined
  setRouter(originalBond)
})

/**
 * Boots the application and keeps it for the teardown.
 *
 * @param options - `bootApp`'s options.
 * @returns The booted application.
 */
const boot = async (options: Parameters<typeof bootApp>[0]): Promise<BootedApp> => {
  booted = await bootApp(options)
  return booted
}

/** A page whose text says which. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-page-one',
  standalone: true,
  template: '<p>page one</p>',
})
class PageOne {}

/** The second page. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-page-two',
  standalone: true,
  template: '<p>page two</p>',
})
class PageTwo {}

/** What the binding's own hooks read: React's `Probe`. */
const probed: { routers: Router[] } = { routers: [] }

/** Reads the router through `@molecule/app-angular`'s hooks and shows the path. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-probe',
  standalone: true,
  template: '<span data-probe="">{{ location().pathname }}</span>',
})
class Probe {
  readonly location = useLocation()

  constructor() {
    probed.routers.push(useRouterInstance())
  }
}

/** The root of the first case: the probe beside Angular's outlet. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-probe-root',
  standalone: true,
  imports: [Probe, RouterOutlet],
  template: '<mol-test-probe /><router-outlet />',
})
class ProbeRoot {}

/** A layout route that renders its page with the binding's `RoutedView`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-layout',
  standalone: true,
  imports: [RoutedView],
  template: '<main data-layout=""><mol-routed-view /></main>',
})
class Layout {}

/** What the params page read at each change detection. */
const paramsSeen: { router: RouteParams; binding: RouteParams }[] = []

/** React's params `Page`: reads the bond's router and the binding's `useParams`. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-params-page',
  standalone: true,
  template: '<p>{{ read() }}</p>',
})
class ParamsPage {
  private readonly router = useMoleculeRouter()
  private readonly binding = useParams()

  /**
   * Records both readings and shows the binding's.
   *
   * @returns The account the binding read.
   */
  read(): string {
    paramsSeen.push({ router: this.router.getParams(), binding: { ...this.binding() } })
    return this.binding().account ?? ''
  }
}

/** Each router `useMoleculeRouter` returned to the shares page. */
const returned: Router[] = []

/** A signal the case moves to update the shares page, React's re-render. */
const count = signal(0)

/** React's shares `Page`: keeps the router `useMoleculeRouter` returned. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-shares-page',
  standalone: true,
  template: '<p>{{ show() }}</p>',
})
class SharesPage {
  private readonly router = useMoleculeRouter()

  /**
   * Records the router and shows the count.
   *
   * @returns The page's text.
   */
  show(): string {
    returned.push(this.router)
    return `page ${count()}`
  }
}

/**
 * The text of the first element `selector` matches.
 *
 * @param app - The booted application.
 * @param selector - A CSS selector.
 * @returns Its text.
 */
const text = (app: BootedApp, selector: string): string | null | undefined =>
  app.host.querySelector(selector)?.textContent

describe('MoleculeRouterProvider and the framework binding', () => {
  it('gives the framework binding the router it bonds', async () => {
    probed.routers = []
    let bonded: Router | undefined
    const app = await boot({
      root: ProbeRoot,
      routes: [
        { path: 'one', component: PageOne },
        { path: 'two', component: PageTwo },
      ],
      initialPath: '/one',
      providers: [provideMoleculeRouter({ onRouterReady: (router) => (bonded = router) })],
    })
    expect(probed.routers).toHaveLength(1)
    expect(probed.routers[0]).toBeDefined()
    expect(probed.routers[0]).toBe(bonded)
    expect(text(app, '[data-probe]')).toBe('/one')

    await app.router.navigateByUrl('/two')
    await app.settle()
    expect(text(app, '[data-probe]')).toBe('/two')
    expect(app.host.textContent).toContain('page two')
  })

  it("puts the native router's matched child route where a layout route renders its page", async () => {
    const app = await boot({
      routes: [
        {
          path: '',
          component: Layout,
          children: [
            { path: 'one', component: PageOne },
            { path: 'two', component: PageTwo },
          ],
        },
      ],
      initialPath: '/one',
      providers: [provideMoleculeRouter()],
    })
    expect(text(app, '[data-layout]')).toBe('page one')

    await app.router.navigateByUrl('/two')
    await app.settle()
    expect(text(app, '[data-layout]')).toBe('page two')
  })

  it("renders the matched page with no element of the routed view's own, through every navigation", async () => {
    const app = await boot({
      routes: [
        {
          path: '',
          component: Layout,
          children: [
            { path: 'one', component: PageOne },
            { path: 'two', component: PageTwo },
          ],
        },
      ],
      initialPath: '/one',
      providers: [provideMoleculeRouter()],
    })
    // React: <main><p>page one</p></main>. Angular adds only the page component's own host.
    const shown = (): string =>
      Array.from(
        app.host.querySelector('[data-layout]')?.children ?? [],
        (el) => el.outerHTML,
      ).join('')
    expect(shown()).toBe('<mol-test-page-one><p>page one</p></mol-test-page-one>')

    await app.router.navigateByUrl('/two')
    await app.settle()
    expect(shown()).toBe('<mol-test-page-two><p>page two</p></mol-test-page-two>')

    await app.router.navigateByUrl('/one')
    await app.settle()
    expect(shown()).toBe('<mol-test-page-one><p>page one</p></mol-test-page-one>')
  })

  it('a provider inside another uses the outer router, registers its routes and calls onRouterReady once', async () => {
    let outer: Router | undefined
    const innerReady = vi.fn<(router: Router) => void>()
    const routes = [{ path: '/items/:id', name: 'item' }]
    const app = await boot({
      routes: [
        { path: '', component: PageOne },
        {
          path: 'items/:id',
          component: PageTwo,
          // A route's providers are Angular's provider inside another: an injector of its own
          // below the application's.
          providers: [provideMoleculeRouter({ routes, onRouterReady: innerReady })],
        },
      ],
      initialPath: '/',
      providers: [provideMoleculeRouter({ onRouterReady: (router) => (outer = router) })],
    })
    await app.router.navigateByUrl('/items/7')
    await app.settle()
    await app.router.navigateByUrl('/items/8')
    await app.settle()

    expect(outer).toBeDefined()
    expect(innerReady).toHaveBeenCalledTimes(1)
    expect(innerReady).toHaveBeenCalledWith(outer)
    expect(getRouter()).toBe(outer)
    expect(outer?.getRoutes()).toEqual(expect.arrayContaining(routes))
  })

  it('a page reads its route params through useMoleculeRouter with no route definitions', async () => {
    paramsSeen.length = 0
    const app = await boot({
      routes: [{ path: 'settings/:account', component: ParamsPage }],
      initialPath: '/settings/team',
      providers: [provideMoleculeRouter()],
    })
    expect(paramsSeen.at(-1)).toEqual({ router: { account: 'team' }, binding: { account: 'team' } })

    paramsSeen.length = 0
    await app.router.navigateByUrl('/settings/personal')
    await app.settle()
    expect(paramsSeen.length).toBeGreaterThan(0)
    // No change detection paired the new page with the previous params.
    expect(paramsSeen).toEqual(
      paramsSeen.map(() => ({ router: { account: 'personal' }, binding: { account: 'personal' } })),
    )
  })

  it("useMoleculeRouter shares the bonded router's guards, named routes and navigation", async () => {
    returned.length = 0
    count.set(0)
    const routes = [{ path: '/settings/:account', name: 'settings' }]
    const app = await boot({
      routes: [
        { path: 'settings/:account', component: SharesPage },
        { path: 'blocked', component: PageTwo },
      ],
      initialPath: '/settings/team',
      providers: [provideMoleculeRouter({ routes })],
    })
    const router = returned[0]
    expect(router.getRoutes()).toEqual(getRouter().getRoutes())
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await router.navigateTo('settings', { account: 'personal' })
    await app.settle()
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')

    // A guard added through the component's router stops a navigation the bonded router starts.
    const removeGuard = router.addGuard((to) => !to.pathname.startsWith('/blocked'))
    await getRouter().navigate('/blocked')
    await app.settle()
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')
    removeGuard()

    count.update((value) => value + 1)
    await app.settle()
    expect(text(app, 'p')).toBe('page 1')
    expect(new Set(returned).size).toBe(1)
  })
})
