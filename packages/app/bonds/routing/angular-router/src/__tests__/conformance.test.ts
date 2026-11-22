// @vitest-environment jsdom
/**
 * The router conformance cases over a real Angular Router (`@angular/router` 22).
 *
 * Each case boots a real Angular application (`createApplication` + `appRef.bootstrap`,
 * which runs Angular's own initial navigation through its bootstrap listener) on the
 * browser location (`PathLocationStrategy` over jsdom's `window.history`, under the
 * kit's base as `APP_BASE_HREF`), with Angular's route config (`users/:id`, the two
 * pages and a catch-all) and {@link provideMoleculeRouter}; the harness then drives both
 * sides — the molecule `Router` the bond builds, and the Angular Router directly
 * (`navigateByUrl` as a link would, `history.back()` as the back button does). A real
 * `<a [routerLink]>` writes the native href.
 *
 * @module
 */

import '@angular/compiler'
import { APP_BASE_HREF } from '@angular/common'
import {
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  provideRouter,
  type Route,
  Router as AngularRouter,
  RouterLink,
  RouterOutlet,
} from '@angular/router'

import { ROUTER, useLocation, useParams } from '@molecule/app-angular'
import type { RouterHarness } from '@molecule/app-framework-conformance/routing'
import {
  type ListRouteNavCaseProps,
  type ListRouteNavCaseRoute,
  type ListRouteNavMount,
  listRouteNavRoutes,
  runListRouteNavConformance,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'

import { ListRouteNav } from '../list-route-nav.js'
import { provideMoleculeRouter } from '../providers.js'
import { bootApp, historyMove } from './angular-app.js'

/** A route target with no markup; routes are matched, never rendered. */
const Empty: Type<unknown> = Component({
  selector: 'mol-conformance-empty',
  standalone: true,
  template: '',
})(class EmptyRouteComponent {})

/** A routed page that shows `page one`. */
const PageOne: Type<unknown> = Component({
  selector: 'mol-conformance-page-one',
  standalone: true,
  template: '<p>page one</p>',
})(class PageOneComponent {})

/** A routed page that shows `page two`. */
const PageTwo: Type<unknown> = Component({
  selector: 'mol-conformance-page-two',
  standalone: true,
  template: '<p>page two</p>',
})(class PageTwoComponent {})

/** Angular's own link to the URL tree it is given, whose href the harness reads. */
/** Stays mounted beside the page and shows the pathname `@molecule/app-angular`'s `useLocation` reads. */
const LocationReader: Type<unknown> = Component({
  selector: 'mol-conformance-location',
  standalone: true,
  template: '<output data-location="">{{ location().pathname }}</output>',
})(
  class LocationReaderComponent {
    readonly location = useLocation()
  },
)

/** The page of `users/:id`: the id `@molecule/app-angular`'s `useParams` reads. */
const UserPage: Type<unknown> = Component({
  selector: 'mol-conformance-user-page',
  standalone: true,
  template: '<p>user {{ params().id }}</p>',
})(
  class UserPageComponent {
    readonly params = useParams()
  },
)

const HrefProbe: Type<unknown> = Component({
  selector: 'mol-conformance-href-probe',
  standalone: true,
  imports: [RouterLink],
  inputs: ['to'],
  template: '<a [routerLink]="to" data-href-probe></a>',
})(
  class HrefProbeComponent {
    to: unknown = null
  },
)

/** The bootstrap root: an outlet so Angular can activate matched routes. */
const Root: Type<unknown> = Component({
  selector: 'mol-conformance-root',
  standalone: true,
  imports: [LocationReader, RouterOutlet],
  template: '<mol-conformance-location /><router-outlet />',
})(class RootComponent {})

/** A settled macrotask: Angular chains popstate moves through a `setTimeout`. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Waits until no Angular navigation is in flight — a `NavigationStart` was answered
 * by its terminal event (`NavigationEnd`/`NavigationCancel`/`NavigationError`/
 * `NavigationSkipped`) and a following macrotask starts nothing new.
 *
 * @returns The idle `settle` wait and the `stop` for its event counting.
 */
const waitUntilIdle = (
  angularRouter: AngularRouter,
): { settle: () => Promise<void>; stop: () => void } => {
  let inFlight = 0
  const stopCounting = angularRouter.events.subscribe((event) => {
    if (event instanceof NavigationStart) {
      inFlight += 1
    } else if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError ||
      event instanceof NavigationSkipped
    ) {
      inFlight = Math.max(0, inFlight - 1)
    }
  })
  const settle = async (): Promise<void> => {
    for (let round = 0; round < 50; round += 1) {
      await tick()
      if (inFlight === 0) {
        await tick()
        if (inFlight === 0) return
      }
    }
    throw new Error(`the Angular Router never went idle (${inFlight} navigations in flight)`)
  }
  return {
    settle,
    stop: () => stopCounting.unsubscribe(),
  }
}

runRouterConformance(
  'angular-router',
  async (initialPath, { base, container }): Promise<RouterHarness> => {
    window.history.replaceState(null, '', base + initialPath)
    const appRef = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'users/:id', component: UserPage },
          { path: 'one', component: PageOne },
          { path: 'two', component: PageTwo },
          { path: '**', component: Empty },
        ]),
        { provide: APP_BASE_HREF, useValue: base },
        // No initial molecule routes: the cases register what they name, and
        // `getRoutes()` must answer only those (the reference harnesses do the same).
        provideMoleculeRouter(),
      ],
    })

    // Getting the router first subscribes the idle counter, so the initial
    // navigation's NavigationStart (emitted during bootstrap) is counted too.
    const angularRouter = appRef.injector.get(AngularRouter)
    const { settle, stop } = waitUntilIdle(angularRouter)

    // Unlike `bootstrapApplication`, `ApplicationRef.bootstrap` does not create the
    // host element — it queries the document for the component's selector.
    const host = document.createElement('mol-conformance-root')
    container.appendChild(host)

    appRef.bootstrap(Root, host)
    await settle()

    const router = appRef.injector.get(ROUTER)

    return {
      router,
      nativePush: async (path) => {
        await angularRouter.navigateByUrl(path)
      },
      nativeBack: () => window.history.back(),
      nativePath: () => angularRouter.url,
      nativeHref: (path) => {
        const probe = createComponent(HrefProbe, {
          environmentInjector: appRef.injector,
          hostElement: document.createElement('mol-conformance-href-probe'),
        })
        probe.setInput('to', angularRouter.parseUrl(path))
        probe.changeDetectorRef.detectChanges()
        const href = probe.location.nativeElement.querySelector('a')?.getAttribute('href')
        probe.destroy()
        if (typeof href !== 'string') throw new Error('routerLink rendered no href')
        return href
      },
      settle,
      teardown: async () => {
        // The `destroy` case already destroyed it; the bond's destroy is idempotent.
        router.destroy()
        stop()
        appRef.destroy()
      },
    }
  },
)

/** Escapes an attribute value for the JIT template a case builds. */
const templateAttr = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

/** The segments a route path names; a more specific path must be declared first. */
const segmentsOf = (path: string): number => path.split('/').filter(Boolean).length

/**
 * The kit's route list as Angular's route table: Angular matches routes in declaration
 * order (the catch-all last) and spells its catch-all `**`.
 *
 * @param paths - The kit's route patterns.
 * @returns Angular's routes, every one component-less (the case page is the bootstrap
 *   root, so a navigation only re-matches; it never re-creates the nav).
 */
const angularRoutes = (paths: readonly string[]): Route[] =>
  [...paths]
    .sort((a, b) => Number(a === '*') - Number(b === '*') || segmentsOf(b) - segmentsOf(a))
    .map((path) => ({ path: path === '*' ? '**' : path.replace(/^\//, ''), children: [] }))

/**
 * The case's page: the bootstrap root whose template is the case's `ListRouteNav`, its
 * `children` template and the case's native nav attributes. The host is flattened by the
 * kit's DOM normalizer (`data-parity-unwrap`), so it adds nothing to the snapshot.
 *
 * @param props - The case's props.
 * @returns The page component type.
 */
const listRouteNavCasePage = (props: ListRouteNavCaseProps): Type<unknown> => {
  const attrs = Object.entries(props.attrs ?? {})
    .map(([name, value]) => ` ${name}="${templateAttr(value)}"`)
    .join('')
  const withChildren = props.children !== undefined
  const children = withChildren
    ? '<ng-template #childrenTpl let-route><output data-testid="children">{{ childText(route) }}</output></ng-template>'
    : ''
  const template = `<nav mol-list-route-nav aria-label="${templateAttr(props['aria-label'])}"${attrs} [selections]="selections" [defaultSelection]="defaultSelection" [pageParam]="pageParam" [list]="list" [linkClassName]="linkClassName"${withChildren ? ' [children]="childrenTpl"' : ''}></nav>${children}`
  return Component({
    selector: 'div[data-parity-unwrap]',
    standalone: true,
    imports: [ListRouteNav],
    host: { 'data-parity-unwrap': '' },
    template,
  })(
    class ListRouteNavCasePage {
      readonly selections = props.selections
      readonly defaultSelection = props.defaultSelection
      readonly pageParam = props.pageParam
      readonly list = props.list
      readonly linkClassName = props.linkClassName
      readonly childText = (route: ListRouteNavCaseRoute): string => props.children?.(route) ?? ''
    },
  )
}

/**
 * Mounts this bond's `ListRouteNav` over a real Angular Router declaring the kit's routes,
 * with no molecule provider, on the browser history (`PathLocationStrategy` over jsdom's
 * `window.history`). Every route is component-less, so a navigation re-matches and updates
 * the params while the page (the nav) stays mounted, as React's matched-element tree does.
 *
 * @param container - Where the app renders.
 * @param initialPath - Where the router starts.
 * @param props - The case's props.
 * @returns The mounted nav.
 */
const mountListRouteNav: ListRouteNavMount = async (container, initialPath, props) => {
  const host = document.createElement('div')
  host.setAttribute('data-parity-unwrap', '')
  container.appendChild(host)
  const app = await bootApp({
    routes: angularRoutes(listRouteNavRoutes),
    initialPath,
    hostElement: host,
    root: listRouteNavCasePage(props),
  })
  return {
    nativePath: () => app.router.url,
    nativeBack: () => historyMove(app, -1),
    nativeForward: () => historyMove(app, 1),
    perform: async (action) => {
      await action()
      await app.settle()
    },
    unmount: async () => {
      app.teardown()
    },
  }
}

runListRouteNavConformance('angular-router', mountListRouteNav)
