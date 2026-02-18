/**
 * Angular service for routing.
 *
 * @module
 */

import { Inject, Injectable, type OnDestroy } from '@angular/core'
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import { ROUTER } from '../tokens.js'

/**
 * Angular service for routing.
 *
 * Wraps molecule router and exposes state as RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-nav',
 *   template: `
 *     <nav>
 *       <a (click)="navigate('/home')">Home</a>
 *       <span>Current: {{ (location$ | async)?.pathname }}</span>
 *     </nav>
 *   `
 * })
 * export class NavComponent {
 *   location$ = this.routerService.location$
 *
 *   constructor(private routerService: MoleculeRouterService) {}
 *
 *   navigate(path: string) {
 *     this.routerService.navigate(path)
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
/**
 * Molecule Router Service class.
 */
export class MoleculeRouterService implements OnDestroy {
  private locationSubject: BehaviorSubject<RouteLocation>
  private paramsSubject: BehaviorSubject<RouteParams>
  private querySubject: BehaviorSubject<QueryParams>
  private unsubscribe: (() => void) | null = null

  /**
   * Observable of the current location.
   */
  location$: Observable<RouteLocation>

  /**
   * Observable of route parameters.
   */
  params$: Observable<RouteParams>

  /**
   * Observable of query parameters.
   */
  query$: Observable<QueryParams>

  /**
   * Observable of the current pathname.
   */
  pathname$: Observable<string>

  constructor(@Inject(ROUTER) private router: Router) {
    this.locationSubject = new BehaviorSubject<RouteLocation>(router.getLocation())
    this.paramsSubject = new BehaviorSubject<RouteParams>(router.getParams())
    this.querySubject = new BehaviorSubject<QueryParams>(router.getQuery())

    this.unsubscribe = router.subscribe(() => {
      this.locationSubject.next(router.getLocation())
      this.paramsSubject.next(router.getParams())
      this.querySubject.next(router.getQuery())
    })

    this.location$ = this.locationSubject.asObservable()
    this.params$ = this.paramsSubject.asObservable()
    this.query$ = this.querySubject.asObservable()

    this.pathname$ = this.location$.pipe(
      map((loc) => loc.pathname),
      distinctUntilChanged(),
    )
  }

  /**
   * Get the current location snapshot.
   * @returns The result.
   */
  get location(): RouteLocation {
    return this.router.getLocation()
  }

  /**
   * Get the current params snapshot.
   * @returns The result.
   */
  get params(): RouteParams {
    return this.router.getParams()
  }

  /**
   * Get the current query snapshot.
   * @returns The result.
   */
  get query(): QueryParams {
    return this.router.getQuery()
  }

  /**
   * Navigate to a path.
   *
   * @param path - Target path
   * @param options - Navigation options
   */
  navigate(path: string, options?: NavigateOptions): void {
    this.router.navigate(path, options)
  }

  /**
   * Navigate to a named route.
   *
   * @param name - Route name
   * @param params - Route parameters
   * @param query - Query parameters
   * @param options - Navigation options
   */
  navigateTo(
    name: string,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void {
    this.router.navigateTo(name, params, query, options)
  }

  /**
   * Go back in history.
   */
  back(): void {
    this.router.back()
  }

  /**
   * Go forward in history.
   */
  forward(): void {
    this.router.forward()
  }

  /**
   * Check if a path is currently active.
   *
   * @param path - Path to check
   * @param exact - Whether to match exactly
   * @returns The result.
   */
  isActive(path: string, exact = false): boolean {
    return this.router.isActive(path, exact)
  }

  /**
   * Cleans up subscriptions and completes subjects on service destruction.
   */
  ngOnDestroy(): void {
    this.unsubscribe?.()
    this.locationSubject.complete()
    this.paramsSubject.complete()
    this.querySubject.complete()
  }
}
