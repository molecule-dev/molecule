// @vitest-environment jsdom

/**
 * The routing functions and `RoutedView`, under `@molecule/app-react`'s test titles. A component
 * that stays mounted across a navigation renders the new location in its first change detection
 * after it; a parent that reads the location shows a navigation its child made in its own
 * `ngOnInit`; `RoutedView` renders the routing bond's routed view and throws when there is none.
 *
 * React records what every COMMIT saw. Angular has no commit of its own: a view renders on its
 * change detection, so each case records what the template rendered on every one, and a stale
 * render fails even though the settled DOM is the same either way.
 *
 * @module
 */

import '@angular/compiler'
import { Component, inject, type OnInit, provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import {
  useLocation,
  useNavigate,
  useParams,
  useQuery,
  useRouterInstance,
} from '../hooks/use-router.js'
import { provideMolecule, provideRouter } from '../providers.js'
import { RoutedView } from '../routed-view.js'
import { ROUTER } from '../tokens.js'

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

/** What the probes rendered, one entry per change detection of their template. */
const renders: string[] = []

/**
 * Configures the testing module with `router` provided as `provideMolecule` provides it.
 *
 * @param router - The router.
 * @param imports - The standalone components under test.
 */
function configure(router: Router, imports: unknown[]): void {
  TestBed.configureTestingModule({
    imports,
    providers: [provideZonelessChangeDetection(), provideMolecule({ router })],
  })
}

/** A page that stays mounted across the navigation. */
@Component({ selector: 'mol-test-location-page', standalone: true, template: '{{ record() }}' })
class LocationPageComponent {
  readonly location = useLocation()
  readonly params = useParams<{ id: string }>()
  readonly query = useQuery<{ tab?: string }>()

  /**
   * Renders the location, params and query, recording what this change detection showed.
   *
   * @returns What it shows.
   */
  record(): string {
    const seen = `${this.location().pathname}${this.location().search} id=${this.params().id} tab=${this.query().tab}`
    renders.push(seen)
    return seen
  }
}

/** A page that only reads the location. */
@Component({ selector: 'mol-test-path-page', standalone: true, template: '{{ record() }}' })
class PathPageComponent {
  readonly location = useLocation()

  /**
   * Renders the path, recording what this change detection showed.
   *
   * @returns What it shows.
   */
  record(): string {
    renders.push(this.location().pathname)
    return this.location().pathname
  }
}

/** Redirects as it is initialized, as a guard does. */
@Component({ selector: 'mol-test-redirects', standalone: true, template: '' })
class RedirectsComponent implements OnInit {
  private readonly navigate = useNavigate()

  /** Navigates away. */
  ngOnInit(): void {
    this.navigate('/moved')
  }
}

/** Shows the path, as a layout computing its active item does, with a child that redirects. */
@Component({
  selector: 'mol-test-shows-path',
  standalone: true,
  imports: [RedirectsComponent],
  template: '<p>{{ location().pathname }}<mol-test-redirects /></p>',
})
class ShowsPathComponent {
  readonly location = useLocation()
}

/** The routing bond's outlet. */
@Component({ selector: 'mol-test-outlet', standalone: true, template: '<p>routed page</p>' })
class OutletComponent {}

/** Renders `RoutedView` where a layout puts its page. */
@Component({
  selector: 'mol-test-layout',
  standalone: true,
  imports: [RoutedView],
  template: '<mol-routed-view />',
})
class LayoutComponent {}

/** Reads the router with none provided. */
@Component({ selector: 'mol-test-no-router', standalone: true, template: '' })
class NoRouterComponent {
  readonly router = useRouterInstance()
}

/**
 * Creates `component` and runs its first change detection, catching what either throws.
 *
 * @param component - The component.
 * @returns Its text and the error it threw, if any.
 */
function createCatching(component: new () => unknown): { text: string; thrown: unknown } {
  try {
    const fixture = TestBed.createComponent(component)
    fixture.detectChanges()
    return { text: (fixture.nativeElement as HTMLElement).textContent ?? '', thrown: undefined }
  } catch (error) {
    return { text: '', thrown: error }
  }
}

describe('the routing hooks across a navigation', () => {
  it('render the new location, params and query in the first commit after it', async () => {
    const router = createMemoryRouter({
      initialEntries: ['/items/1?tab=a'],
      routes: [{ path: '/items/:id' }],
    })
    configure(router, [LocationPageComponent])
    const fixture = TestBed.createComponent(LocationPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    renders.length = 0
    router.navigate('/items/2?tab=b')
    fixture.detectChanges()
    await fixture.whenStable()
    expect(renders.length).toBeGreaterThan(0)
    expect(renders).toEqual(renders.map(() => '/items/2?tab=b id=2 tab=b'))
  })

  it('counterexample: a location that does not change renders no new value', async () => {
    const router = createMemoryRouter({ initialEntries: ['/items/1'] })
    configure(router, [PathPageComponent])
    renders.length = 0
    const fixture = TestBed.createComponent(PathPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(new Set(renders)).toEqual(new Set(['/items/1']))
  })

  it('a parent reading the location shows the navigation a child makes as it mounts', async () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    configure(router, [ShowsPathComponent])
    const fixture = TestBed.createComponent(ShowsPathComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('/moved')
  })
})

describe('RoutedView', () => {
  it("renders the routed view the routing bond's RouterProvider was given", () => {
    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(createMemoryRouter(), { routedView: OutletComponent }),
      ],
    })
    const { text, thrown } = createCatching(LayoutComponent)
    expect(thrown).toBeUndefined()
    expect(text).toBe('routed page')
  })

  it('throws a translatable error naming the fix when the bond has no routed view', () => {
    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [provideZonelessChangeDetection(), provideRouter(createMemoryRouter())],
    })
    const { thrown } = createCatching(LayoutComponent)
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('angular.error.noRoutedView')
    expect((thrown as Error).message).toMatch(/pass the page as children/)
    // A router mounted by a bond older than this binding gives none: the message names the update.
    expect((thrown as Error).message).toContain(
      'older than this binding: update it (`npm install @molecule/app-routing-angular-router@latest`)',
    )
  })

  it('names the fix when a routing hook runs with no router', () => {
    TestBed.configureTestingModule({
      imports: [NoRouterComponent],
      providers: [provideZonelessChangeDetection()],
    })
    expect(TestBed.runInInjectionContext(() => inject(ROUTER, { optional: true }))).toBeNull()
    const { thrown } = createCatching(NoRouterComponent)
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('angular.error.useRouterOutsideProvider')
    expect((thrown as Error).message).toMatch(/routing bond/)
    // A router mounted by a bond older than this binding gives none: the message names the update.
    expect((thrown as Error).message).toContain(
      'older than this binding: update it (`npm install @molecule/app-routing-angular-router@latest`)',
    )
  })
})
