// @vitest-environment jsdom
/**
 * Render-time state adjustments — Angular port of
 * `@molecule/app-ui-react/src/__tests__/render-time-state-adjustments.test.tsx`:
 *
 * - `Dropdown` with a controlled `open` reports a route-change close through
 *   `openChange` (the owner scripts hold the state, so the component cannot
 *   close itself);
 * - `Dropdown width="trigger"` sizes the menu from the trigger width measured
 *   when it opens, not from a stale value;
 * - a reopened `PromptDialog` seeds its input from the CURRENT `initialValue`.
 *
 * Angular forces the translation: the controlled `open` is an input bound to
 * the owner's field, a report arrives through the `openChange` output, and a
 * route change is a real navigation the injected router notifies (React's
 * re-render with a new `useLocation` value).
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import {
  provideDomPlacement,
  provideRouter,
  type RouteLocation,
  type Router,
} from '@molecule/app-angular'
import type { DropdownItem } from '@molecule/app-ui'

vi.mock('@molecule/app-ui', () => {
  /**
   * The ClassMap stand-in: tokens the templates CALL resolve to functions,
   * every other token to its own name (Angular's class binding rejects
   * function values).
   *
   * @returns The proxied ClassMap.
   */
  const getClassMap = (): unknown => {
    const CALLABLE = new Set([
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'input',
      'button',
      'spinner',
      'label',
    ])
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
  }
  return { getClassMap }
})

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
      locale: () => 'en',
    }),
  }
})

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { Dropdown } = await import('../components/dropdown.component.js')
const { PromptDialog } = await import('../components/prompt-dialog.component.js')

const items: DropdownItem<string>[] = [{ value: 'a', label: 'Item A' }]

/** A memory router whose location the components follow. */
interface MemoryRouter {
  /** The router instance the components follow. */
  router: Router
  /** Navigates the router, notifying its subscribers. */
  navigate: (path: string) => void
}

/**
 * Splits a path into its location parts.
 *
 * @param path - The path to parse.
 * @returns The parsed location.
 */
function parseLocation(path: string): RouteLocation {
  const [rest, hash = ''] = path.split('#')
  const [pathname = '/', search = ''] = (rest ?? '').split('?')
  return {
    pathname: pathname || '/',
    search: search ? `?${search}` : '',
    hash: hash ? `#${hash}` : '',
  }
}

/**
 * Builds a router that starts at a path and follows navigations.
 *
 * @param initial - The starting path.
 * @returns The router and its navigation driver.
 */
function memoryRouter(initial: string): MemoryRouter {
  let location = parseLocation(initial)
  const listeners = new Set<Parameters<Router['subscribe']>[0]>()
  /** Notifies every subscriber, like a real navigation. */
  const notify = (): void => {
    for (const listener of [...listeners]) listener(location, 'push')
  }
  const router: Router = {
    getLocation: () => location,
    // The components under test never read route params; the empty bag is the
    // value a route without params carries.
    getParams: <T extends Record<string, string> = Record<string, string>>(): T => ({}) as T,
    getQuery: () => ({}),
    getQueryParam: () => undefined,
    getHash: () => location.hash,
    navigate: (path) => {
      location = parseLocation(path)
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
      location = parseLocation(path)
      notify()
    },
  }
}

/** What the dropdown host exposes to a test (React's dropdown props). */
interface DropdownHostInstance {
  /** The menu items. */
  items: DropdownItem<string>[]
  /** The controlled open state (undefined keeps the menu uncontrolled). */
  open?: boolean
  /** The menu width (`trigger` sizes it from the trigger). */
  width?: 'trigger'
  /** Every reported open state, in order (React's `onOpenChange` calls). */
  reports: boolean[]
}

/** Host the tests drive: React's `<Dropdown trigger items open onOpenChange />`. */
const DropdownHost: Type<DropdownHostInstance> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-dropdown-render-host',
  standalone: true,
  imports: [Dropdown],
  template: `<mol-dropdown
    [items]="items"
    [open]="open"
    [width]="width"
    (openChange)="report($event)"
    ><button slot="trigger" type="button">Actions</button></mol-dropdown
  >`,
})(
  class SpecDropdownHost implements DropdownHostInstance {
    /** The menu items. */
    items = items
    /** The controlled open state. */
    open?: boolean
    /** The menu width. */
    width?: 'trigger'
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

/** What the prompt host exposes to a test (React's PromptDialog props). */
interface PromptHostInstance {
  /** Whether the dialog is open. */
  open: WritableSignal<boolean>
  /** The value the input starts from every time the dialog opens. */
  initialValue: WritableSignal<string>
}

/** Host the tests drive: React's `<PromptDialog open initialValue … />`. */
const PromptHost: Type<PromptHostInstance> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-prompt-reopen-host',
  standalone: true,
  imports: [PromptDialog],
  template: `<mol-prompt-dialog
    [open]="open()"
    [title]="'Rename board'"
    placeholder="Board name"
    [initialValue]="initialValue()"
    [onSubmit]="onSubmit"
    inputMolId="prompt-input"
  ></mol-prompt-dialog>`,
})(
  class SpecPromptHost implements PromptHostInstance {
    /** Whether the dialog is open. */
    readonly open = signal(true)
    /** The value the input starts from every time the dialog opens. */
    readonly initialValue = signal('Sprint 4')

    /**
     * React's `onSubmit` (the test does not submit).
     *
     * @param _value - The entered value.
     */
    onSubmit(_value: string): void {}
  },
)

/** The router every mounted component follows (fresh per mount). */
let router: Router
/** The navigation driver for {@link router}. */
let nav: MemoryRouter

/**
 * Mounts a host component.
 *
 * @param host - The host component to mount.
 * @param configure - Applies the test's props before the first pass.
 * @returns The fixture.
 */
function mount<T>(host: Type<T>, configure?: (instance: T) => void): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const fixture = TestBed.createComponent(host)
  if (configure) configure(fixture.componentInstance)
  fixture.detectChanges()
  return fixture
}

/** The portaled menu element, when open. */
function menu(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[role="menu"]')
}

/** The dropdown trigger the consumer composed. */
function dropdownTrigger(fixture: ComponentFixture<DropdownHostInstance>): HTMLElement {
  return within(fixture.nativeElement).getByRole('button', { name: 'Actions' })
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  nav = memoryRouter('/')
  router = nav.router
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Dropdown — controlled open closes on route change', () => {
  it('reports the close through onOpenChange instead of only resetting internally', async () => {
    const fixture = mount(DropdownHost, (instance) => {
      instance.open = false
    })

    fireEvent.click(dropdownTrigger(fixture))
    fixture.detectChanges()
    expect(menu()).toBeTruthy()

    nav.navigate('/elsewhere')
    await fixture.whenStable()
    fixture.detectChanges()

    expect(menu()).toBeNull()
    expect(fixture.componentInstance.reports.at(-1)).toBe(false)
  })
})

describe('Dropdown — width="trigger"', () => {
  it('sizes the menu from the trigger width measured at commit', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    const fixture = mount(DropdownHost, (instance) => {
      instance.width = 'trigger'
    })

    fireEvent.click(dropdownTrigger(fixture))
    // The open pass creates the menu and measures the trigger; the next pass
    // paints the measured width onto it (React renders the menu with the
    // width already in hand).
    fixture.detectChanges()
    fixture.detectChanges()

    const element = menu()
    expect(element).toBeTruthy()
    expect(element?.style.width).toBe('180px')
  })
})

describe('PromptDialog — reopening', () => {
  it('seeds the input from the initialValue of the render that opens it', async () => {
    const fixture = mount(PromptHost)
    await fixture.whenStable()
    fixture.detectChanges()

    /**
     * The prompt input, looked up by its accessible name.
     *
     * @returns The input element.
     */
    const input = (): HTMLInputElement => {
      const element = within(document.body).getByLabelText('Rename board', { selector: 'input' })
      if (!(element instanceof HTMLInputElement)) throw new TypeError('expected the prompt input')
      return element
    }
    expect(input().value).toBe('Sprint 4')

    // The user edits, then the dialog closes and the caller's value moves on.
    fireEvent.input(input(), { target: { value: 'Sprint 5' } })
    await fixture.whenStable()
    fixture.detectChanges()
    expect(input().value).toBe('Sprint 5')

    fixture.componentInstance.open.set(false)
    fixture.componentInstance.initialValue.set('Sprint 5')
    fixture.detectChanges()
    fixture.componentInstance.open.set(true)
    fixture.componentInstance.initialValue.set('Sprint 6')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(input().value).toBe('Sprint 6')
  })
})
