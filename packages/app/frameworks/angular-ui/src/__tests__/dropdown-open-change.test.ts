// @vitest-environment jsdom
/**
 * `Dropdown`'s `onOpenChange` contract with an owner that follows it (the
 * usual controlled wiring, `open={open} onOpenChange={setOpen}`) — a port of
 * `@molecule/app-ui-react/src/__tests__/dropdown-open-change.test.tsx`: the
 * menu reports a change only when one happens (a toggle, a selection, Escape,
 * a route change), so an owner that follows every report keeps the menu open
 * until something closes it.
 *
 * Angular forces the translation: the menu is opened through an `open` input
 * bound to the owner's field, a report arrives through the `openChange`
 * output, and a route change is a real navigation the injected router
 * notifies (React's re-render with a new `useLocation` value).
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  provideDomPlacement,
  provideRouter,
  type RouteLocation,
  type Router,
} from '@molecule/app-angular'

vi.mock('@molecule/app-ui', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
  getClassMap: () => {
    // Tokens the dropdown template CALLS as functions; every other token must
    // be a plain string — Angular's class binding rejects function values.
    const CALLABLE = new Set(['cn', 'dropdownContent', 'dropdownItem'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Dropdown } = await import('../components/dropdown.component.js')

const ITEMS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
]

/** A memory router whose location the menu follows. */
interface MemoryRouter {
  /** The router instance the menu follows. */
  router: Router
  /** Navigates the router, notifying its subscribers. */
  navigate: (path: string) => void
}

/**
 * Builds a router that starts at a path and follows navigations.
 *
 * @param initial - The starting path.
 * @returns The router and its navigation driver.
 */
function memoryRouter(initial: string): MemoryRouter {
  /**
   * Splits a path into its location parts.
   *
   * @param path - The path to parse.
   * @returns The parsed location.
   */
  const parse = (path: string): RouteLocation => {
    const [rest, hash = ''] = path.split('#')
    const [pathname = '/', search = ''] = (rest ?? '').split('?')
    return {
      pathname: pathname || '/',
      search: search ? `?${search}` : '',
      hash: hash ? `#${hash}` : '',
    }
  }
  let location = parse(initial)
  const listeners = new Set<Parameters<Router['subscribe']>[0]>()
  /**
   * Notifies every subscriber, like a real navigation.
   */
  const notify = (): void => {
    for (const listener of [...listeners]) listener(location, 'push')
  }
  const router: Router = {
    getLocation: () => location,
    getParams: <T extends Record<string, string> = Record<string, string>>(): T => ({}) as T,
    getQuery: () => ({}),
    getQueryParam: () => undefined,
    getHash: () => location.hash,
    navigate: (path) => {
      location = parse(path)
      notify()
    },
    navigateTo: () => {},
    back: () => {},
    forward: () => {},
    go: () => {},
    setQuery: () => {},
    setQueryParam: () => {},
    setHash: () => {},
    isActive: (path) => location.pathname === path,
    matchPath: () => null,
    generatePath: () => '',
    createHref: (path: string) => path,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addGuard: () => () => {},
    registerRoutes: () => {},
    getRoutes: () => [],
    destroy: () => listeners.clear(),
  }
  return {
    router,
    navigate: (path) => {
      location = parse(path)
      notify()
    },
  }
}

/**
 * An owner that follows every `openChange` report (React's
 * `open={open} onOpenChange={setOpen}` wiring), starting closed.
 */
const ControlledOwner = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-dropdown-controlled',
  standalone: true,
  imports: [Dropdown],
  template: `<mol-dropdown [items]="items" [open]="open" (openChange)="report($event)">
    <button slot="trigger" type="button">Options</button>
  </mol-dropdown>`,
})(
  class ControlledOwnerComponent {
    /** The menu items. */
    items = ITEMS
    /** The owner's open state (the controlled `open` input). */
    open = false
    /** Every reported open state, in order. */
    reports: boolean[] = []

    /**
     * Follows a report, like React's `setOpen`.
     *
     * @param next - The reported open state.
     */
    report(next: boolean): void {
      this.reports.push(next)
      this.open = next
    }
  },
)

/** The uncontrolled dropdown under test. */
const UncontrolledOwner = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-dropdown-uncontrolled',
  standalone: true,
  imports: [Dropdown],
  template: `<mol-dropdown [items]="items" (openChange)="report($event)">
    <button slot="trigger" type="button">Options</button>
  </mol-dropdown>`,
})(
  class UncontrolledOwnerComponent {
    /** The menu items. */
    items = ITEMS
    /** Every reported open state, in order. */
    reports: boolean[] = []

    /**
     * Records a report.
     *
     * @param next - The reported open state.
     */
    report(next: boolean): void {
      this.reports.push(next)
    }
  },
)

/** A dropdown whose trigger is projected from a consumer list. */
const ListOwner = Component({
  selector: 'mol-spec-dropdown-list',
  standalone: true,
  imports: [Dropdown],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<mol-dropdown [items]="items"
    >@for (x of xs; track x) {<button slot="trigger" type="button">{{ x }}</button>}</mol-dropdown
  >`,
})(
  class ListOwnerComponent {
    /** The menu items. */
    items = ITEMS
    /** The trigger content items. */
    xs: string[] = ['a', 'c']
  },
)

/** The menu element the dropdown portals into the body. */
const menu = (): HTMLElement | null => document.body.querySelector('[role="menu"]')

/**
 * Mounts an owner with a router the menu follows.
 *
 * @param host - The owner component to mount.
 * @param router - The router to provide.
 * @param configure - Applies the test's props before the first pass.
 * @returns The fixture.
 */
function render<T>(
  host: Type<T>,
  router: Router,
  configure?: (instance: T) => void,
): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const fixture = TestBed.createComponent(host)
  if (configure) configure(fixture.componentInstance)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
})

describe('Dropdown onOpenChange with an owner that follows it', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of trigger', () => {
    const router = memoryRouter('/')
    const fixture = render(ListOwner, router.router)
    const trigger = (): string =>
      document.querySelector('[role="button"]')?.textContent?.replace(/\s/g, '') ?? ''
    expect(trigger()).toBe('ac')
    fixture.componentInstance.xs = ['a', 'b', 'c']
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck()
    expect(() => fixture.componentRef.injector.get(ApplicationRef).tick()).not.toThrow()
    expect(trigger()).toBe('abc')
    fixture.componentInstance.xs = ['a', 'c']
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck()
    expect(() => fixture.componentRef.injector.get(ApplicationRef).tick()).not.toThrow()
    expect(trigger()).toBe('ac')
  })

  it('keeps a menu mounted open open, and reports nothing on mount', () => {
    const router = memoryRouter('/')
    const fixture = render(ControlledOwner, router.router, (instance) => {
      instance.open = true
    })

    expect(menu()).toBeTruthy()
    expect(fixture.componentInstance.reports).toEqual([])
  })

  it('keeps a menu opened by the trigger open', () => {
    const router = memoryRouter('/')
    const fixture = render(ControlledOwner, router.router)

    fireEvent.click(within(fixture.nativeElement).getByRole('button', { name: 'Options' }))
    fixture.detectChanges()

    expect(menu()).toBeTruthy()
    expect(fixture.componentInstance.reports).toEqual([true])
  })

  it('closes through onOpenChange when the route changes', async () => {
    const router = memoryRouter('/')
    const fixture = render(ControlledOwner, router.router)
    fireEvent.click(within(fixture.nativeElement).getByRole('button', { name: 'Options' }))
    fixture.detectChanges()
    expect(menu()).toBeTruthy()

    router.navigate('/settings')
    await fixture.whenStable()
    fixture.detectChanges()

    expect(menu()).toBeNull()
    expect(fixture.componentInstance.reports).toEqual([true, false])
  })
})

describe('uncontrolled Dropdown onOpenChange', () => {
  it('reports nothing on mount, then each toggle and the route-change close', async () => {
    const router = memoryRouter('/')
    const fixture = render(UncontrolledOwner, router.router)
    expect(fixture.componentInstance.reports).toEqual([])

    fireEvent.click(within(fixture.nativeElement).getByRole('button', { name: 'Options' }))
    fixture.detectChanges()
    expect(menu()).toBeTruthy()

    router.navigate('/?tab=2')
    await fixture.whenStable()
    fixture.detectChanges()

    expect(menu()).toBeNull()
    expect(fixture.componentInstance.reports).toEqual([true, false])
  })
})
