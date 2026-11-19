/**
 * React's routing hooks for the Angular Router.
 *
 * `useMoleculeRouter`, `useMoleculeQuery`, `useMoleculeNavigate` and `useIsActive` work
 * inside any booted Angular application whose injector has Angular's `Router`
 * (`provideRouter(routes)`, or `provideRouter` plus `provideLocationMocks()` for a
 * memory history), from this package's `provideMoleculeRouter` or from nothing at all —
 * exactly as React's hooks need no `MoleculeRouterProvider`. Call them in an injection
 * context: a component field initializer or constructor.
 *
 * Angular has no re-render, so the two hooks whose answer changes with the URL return
 * Angular signals (`Signal<QueryParams>`, `Signal<boolean>`) rather than the plain values
 * React returns from its render; the router and the navigate function are plain values,
 * as React's are.
 *
 * @module
 */

import { Location } from '@angular/common'
import { DestroyRef, inject, type Signal, signal } from '@angular/core'
import { Router as AngularRouter } from '@angular/router'

import { I18nError } from '@molecule/app-i18n'
import { matchPath, type QueryParams, type Router } from '@molecule/app-routing'

import { MOLECULE_ROUTER_CONTEXT, moleculeRouterFor } from './router-context.js'

/**
 * Builds the "no router is provided" error, naming how to provide one.
 *
 * @param cause - Angular's own failure when the call is outside an injection context.
 * @returns The error to throw.
 */
const outsideRouter = (cause?: unknown): I18nError =>
  new I18nError(
    'routing.angularRouter.error.useMoleculeRouterOutsideRouter',
    undefined,
    "`useMoleculeRouter` must be called in an injection context of an Angular app that provides the router. Add `provideRouter(routes)` to the app's providers.",
    cause,
  )

/**
 * Reads the Angular Router and Location of the calling application, throwing the
 * "outside a router" error when there is none — the answer React's `useInRouterContext`
 * gives when no router component is mounted above the hook.
 *
 * Angular's `inject` fails with NG0203 outside an injection context (outside any booted
 * application); that failure is the same answer, so it becomes the same error.
 *
 * @returns The application's Angular Router and Location.
 * @throws {I18nError} `routing.angularRouter.error.useMoleculeRouterOutsideRouter` outside a booted
 *   Angular application whose injector provides Angular's `Router`.
 */
const requireAngularRouter = (): { router: AngularRouter; location: Location } => {
  let angularRouter: AngularRouter | null
  try {
    angularRouter = inject(AngularRouter, { optional: true })
  } catch (error) {
    throw outsideRouter(error)
  }
  if (angularRouter === null) throw outsideRouter()
  const location = inject(Location, { optional: true })
  if (location === null) throw outsideRouter()
  return { router: angularRouter, location }
}

/**
 * Gets the molecule `Router` inside any Angular application that has Angular's `Router`.
 * No `provideMoleculeRouter` is required.
 *
 * When `provideMoleculeRouter` is mounted, returns its exact router with its named routes.
 * Otherwise returns ONE molecule router per Angular Router instance for that application's
 * whole life — its location, params and queries follow Angular through every navigation,
 * and `subscribe()` hears Angular's own links and the back button — without bonding it
 * globally. Mount `provideMoleculeRouter` for the non-Angular `@molecule/app-routing`
 * `navigate()`/`getRouter()` bond, named routes, or `onRouterReady`.
 *
 * Call it in an injection context (a component field initializer or constructor).
 *
 * @returns The molecule `Router` instance.
 * @throws {I18nError} `routing.angularRouter.error.useMoleculeRouterOutsideRouter` outside a booted
 *   Angular application whose injector provides Angular's `Router`.
 *
 * @example
 * ```ts
 * @Component({ selector: 'app-nav', template: '<button (click)="go()">Dashboard</button>' })
 * export class NavComponent {
 *   private readonly router = useMoleculeRouter()
 *   go(): void {
 *     void this.router.navigate('/dashboard')
 *   }
 * }
 * ```
 */
export function useMoleculeRouter(): Router {
  const { router, location } = requireAngularRouter()
  const bonded = inject(MOLECULE_ROUTER_CONTEXT, { optional: true })
  if (bonded) return bonded
  return moleculeRouterFor(router, location)
}

/**
 * Gets a navigate function with the molecule `Router` options inside any Angular
 * application that has Angular's `Router`. `provideMoleculeRouter` is optional; mount it
 * only for named routes, the non-Angular `navigate()`/`getRouter()` bond, or
 * `onRouterReady`.
 *
 * Call it in an injection context (a component field initializer or constructor).
 *
 * @returns The navigate function, bound to the router the hook resolved.
 *
 * @example
 * ```ts
 * @Component({ selector: 'app-form', template: '<button (click)="submit()">Save</button>' })
 * export class FormComponent {
 *   private readonly navigate = useMoleculeNavigate()
 *   async submit(): Promise<void> {
 *     await saveData()
 *     await this.navigate('/success', { state: { fromForm: true } })
 *   }
 * }
 * ```
 */
export function useMoleculeNavigate(): Router['navigate'] {
  const router = useMoleculeRouter()
  return router.navigate.bind(router)
}

/**
 * Gets the current query parameters as a signal inside any Angular application that has
 * Angular's `Router`, re-evaluated on every navigation. `provideMoleculeRouter` is
 * optional; mount it only for named routes, the non-Angular `navigate()`/`getRouter()`
 * bond, or `onRouterReady`.
 *
 * Call it in an injection context (a component field initializer or constructor).
 *
 * @returns A signal of the query parameters; read it in the template as `query()`.
 *
 * @example
 * ```ts
 * @Component({ selector: 'app-search', template: '<p>{{ query().q }}</p>' })
 * export class SearchResultsComponent {
 *   readonly query = useMoleculeQuery()
 * }
 * ```
 */
export function useMoleculeQuery(): Signal<QueryParams> {
  const router = useMoleculeRouter()
  const query = signal<QueryParams>(router.getQuery())
  const stop = router.subscribe(() => query.set(router.getQuery()))
  inject(DestroyRef).onDestroy(stop)
  return query.asReadonly()
}

/**
 * Checks whether a path is currently active inside any Angular application that has
 * Angular's `Router`, re-evaluated on every navigation. `provideMoleculeRouter` is
 * optional; mount it only for named routes, the non-Angular `navigate()`/`getRouter()`
 * bond, or `onRouterReady`.
 *
 * Call it in an injection context (a component field initializer or constructor).
 *
 * @param path - The path to check.
 * @param exact - Whether to require an exact match (default: `false`).
 * @returns A signal of whether the path is active; read it in the template as `active()`.
 *
 * @example
 * ```ts
 * @Component({
 *   selector: 'app-nav-link',
 *   template: '<a [href]="to" [attr.aria-current]="active() ? current : null">{{ label }}</a>',
 * })
 * export class NavLinkComponent {
 *   readonly to = '/orders'
 *   readonly label = 'Orders'
 *   readonly current = 'page'
 *   readonly active = useIsActive('/orders', false)
 * }
 * ```
 */
export function useIsActive(path: string, exact: boolean = false): Signal<boolean> {
  const router = useMoleculeRouter()
  const matches = (): boolean => matchPath(path, router.getLocation().pathname, exact) !== null
  const active = signal<boolean>(matches())
  const stop = router.subscribe(() => active.set(matches()))
  inject(DestroyRef).onDestroy(stop)
  return active.asReadonly()
}
