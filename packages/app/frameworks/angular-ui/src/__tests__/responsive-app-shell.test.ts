// @vitest-environment jsdom
/**
 * Render tests for the `ResponsiveAppShell` family — Angular port of
 * `@molecule/app-ui-react/src/__tests__/responsive-app-shell.test.tsx`: the
 * mobile shell (top bar + dialog drawer) and the desktop shell (sidebar)
 * mount per the 768px breakpoint, and the drawer implements the dialog a11y
 * contract (focus trap/restore, Escape, backdrop, scroll lock, route-change
 * auto-close).
 *
 * Angular forces the translation: the sub-components are named component
 * classes composed in the consuming template (React's dot-properties), a
 * navigation is a real router notification the injected router publishes
 * (React's re-render with a new `useLocation` value), and the composable is a
 * signal read in a component field initializer.
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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import {
  provideDomPlacement,
  provideRouter,
  type RouteLocation,
  type Router,
} from '@molecule/app-angular'

// ---------------------------------------------------------------------------
// matchMedia mock. jsdom has no `window.matchMedia`; the shell reads it
// synchronously when its state is created, so tests set `matches` BEFORE
// mounting. `setDesktop` + `fireViewportChange` simulate crossing 768px.
// ---------------------------------------------------------------------------
let matches = false
const changeListeners = new Set<(event: { matches: boolean }) => void>()

vi.mock('@molecule/app-ui', async (importOriginal) => {
  /**
   * The ClassMap stand-in: tokens the shell CALLS resolve to functions, every
   * other token to its own name.
   *
   * @returns The proxied ClassMap.
   */
  const getClassMap = (): unknown => {
    const CALLABLE = new Set(['flex', 'minH', 'sp', 'h', 'w', 'position', 'stack'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  }
  return { ...(await importOriginal<Record<string, unknown>>()), getClassMap }
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

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellTopBar,
} = await import('../components/responsive-app-shell.component.js')

const { useIsDesktop } = await import('../hooks/use-is-desktop.js')

/** What the canonical shell host exposes to a test. */
interface ShellHostInstance {
  /** Width preset or exact pixels for the sidebar and drawer. */
  sidebarWidth?: 'sm' | 'md' | 'lg' | number
  /** Render the top bar only below the breakpoint. */
  mobileOnlyTopBar: boolean
}

/** The canonical shell composition (React's `<Shell />`). */
const ShellHost: Type<ShellHostInstance> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-shell-host',
  standalone: true,
  imports: [
    ResponsiveAppShell,
    ResponsiveAppShellTopBar,
    ResponsiveAppShellSidebar,
    ResponsiveAppShellDrawer,
    ResponsiveAppShellContent,
  ],
  template: `<div mol-responsive-app-shell [sidebarWidth]="sidebarWidth">
    <header mol-responsive-app-shell-topbar [mobileOnly]="mobileOnlyTopBar">
      <span slot="brand">Timetrack</span>
    </header>
    <aside mol-responsive-app-shell-sidebar>
      <a href="/dashboard">Dashboard</a><a href="/projects">Projects</a
      ><a href="/reports">Reports</a>
    </aside>
    <mol-responsive-app-shell-drawer
      ><a href="/dashboard">Dashboard</a><a href="/projects">Projects</a
      ><a href="/reports">Reports</a></mol-responsive-app-shell-drawer
    >
    <main mol-responsive-app-shell-content><p>Page body</p></main>
  </div>`,
})(
  class SpecShellHost implements ShellHostInstance {
    /** Width preset or exact pixels for the sidebar and drawer. */
    sidebarWidth?: 'sm' | 'md' | 'lg' | number
    /** Render the top bar only below the breakpoint. */
    mobileOnlyTopBar = false
  },
)

/** A composition with no `Drawer` (React's "hides the menu trigger" case). */
const NoDrawerShellHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-no-drawer-shell-host',
  standalone: true,
  imports: [
    ResponsiveAppShell,
    ResponsiveAppShellTopBar,
    ResponsiveAppShellSidebar,
    ResponsiveAppShellContent,
  ],
  template: `<div mol-responsive-app-shell>
    <header mol-responsive-app-shell-topbar></header>
    <aside mol-responsive-app-shell-sidebar><a href="/dashboard">Dashboard</a></aside>
    <main mol-responsive-app-shell-content>Page body</main>
  </div>`,
})(class SpecNoDrawerShellHost {})

/** A `TopBar` with no enclosing shell (React throws for this). */
const OrphanTopBarHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-orphan-topbar-host',
  standalone: true,
  imports: [ResponsiveAppShellTopBar],
  template: `<header mol-responsive-app-shell-topbar></header>`,
})(class SpecOrphanTopBarHost {})

/** A `Drawer` with no enclosing shell (React throws for this). */
const OrphanDrawerHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-orphan-drawer-host',
  standalone: true,
  imports: [ResponsiveAppShellDrawer],
  template: `<mol-responsive-app-shell-drawer>x</mol-responsive-app-shell-drawer>`,
})(class SpecOrphanDrawerHost {})

/** What the desktop probe exposes to a test. */
interface ProbeHostInstance {
  /** The signal `useIsDesktop` returns (read in a field initializer). */
  isDesktop: () => boolean
}

/** A component that paints `useIsDesktop()`'s current value. */
const ProbeHost: Type<ProbeHostInstance> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-desktop-probe',
  standalone: true,
  template: `<span data-mol-id="is-desktop">{{ isDesktop() ? 'true' : 'false' }}</span>`,
})(
  class SpecProbeHost implements ProbeHostInstance {
    /** The signal `useIsDesktop` returns, created in the injection context. */
    isDesktop = useIsDesktop()
  },
)

/** A memory router the shell follows; the shell reads only its location. */
interface MemoryRouter {
  /** The router instance the shell follows. */
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
    // The shell never reads route params; the empty bag is the value a route
    // without params carries.
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

/** The router every mounted shell follows (fresh per mount). */
let router: Router

/**
 * Mounts a host component into the document (the shell's landmarks, the
 * drawer portal and focus moves are all observable from `document.body`).
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
  document.body.appendChild(fixture.nativeElement)
  if (configure) configure(fixture.componentInstance)
  fixture.detectChanges()
  return fixture
}

/**
 * Sets the viewport class the mocked matchMedia reports.
 *
 * @param next - Whether the viewport is desktop-wide.
 */
function setDesktop(next: boolean): void {
  matches = next
}

/** Fires the `change` listeners every mounted matchMedia subscription holds. */
function fireViewportChange(): void {
  for (const listener of [...changeListeners]) listener({ matches })
}

/** The mobile shell's menu trigger, failing loudly when absent. */
function trigger(): HTMLElement {
  return within(document.body).getByRole('button', { name: 'Open navigation menu' })
}

/** The drawer's close button, failing loudly when absent. */
function closeButton(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-mol-id="shell-drawer-close"]')
  if (!element) throw new Error('expected the drawer close button')
  return element
}

/** The open drawer's dialog panel, failing loudly when absent. */
function dialog(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!element) throw new Error('expected the open drawer dialog')
  return element
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  matches = false
  changeListeners.clear()
  router = memoryRouter('/dashboard').router
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: (event: { matches: boolean }) => void): void => {
        changeListeners.add(cb)
      },
      removeEventListener: (_type: string, cb: (event: { matches: boolean }) => void): void => {
        changeListeners.delete(cb)
      },
    }),
  })
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('ResponsiveAppShell on mobile (<768px)', () => {
  it('renders top bar + content, with the sidebar unmounted and the drawer closed by default', () => {
    mount(ShellHost)
    expect(within(document.body).getByRole('banner')).toBeDefined()
    expect(within(document.body).getByRole('main')).toBeDefined()
    expect(within(document.body).getByText('Page body')).toBeDefined()
    // Desktop chrome must not exist — not even CSS-hidden.
    expect(within(document.body).queryByRole('complementary')).toBeNull()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
    // The trigger is present, wired to the (absent) panel, and reports closed.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().getAttribute('aria-controls')).toBeTruthy()
  })

  it('the trigger opens the drawer dialog, moves focus into it, and reports expanded', () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()

    const panel = dialog()
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(panel.getAttribute('aria-label')).toBe('Primary navigation')
    expect(panel.getAttribute('data-mol-id')).toBe('shell-drawer')
    // A nav landmark lives INSIDE the dialog, carrying the consumer's links.
    expect(within(panel).getByRole('navigation').getAttribute('aria-label')).toBe(
      'Primary navigation',
    )
    expect(within(panel).getByRole('link', { name: 'Projects' })).toBeDefined()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    // Focus moved to the panel's first tab stop (the close button), and the
    // trigger's aria-controls resolves to the panel's actual id.
    expect(document.activeElement).toBe(closeButton())
    expect(panel.id).toBe(trigger().getAttribute('aria-controls'))
    // Body scroll locks while the drawer is open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Escape closes the drawer, unlocks scroll, and restores focus to the trigger', () => {
    const fixture = mount(ShellHost)
    // fireEvent.click does not move focus — a real user's pointer click does,
    // so focus the trigger first to make the restore assertion meaningful.
    trigger().focus()
    fireEvent.click(trigger())
    fixture.detectChanges()
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })
    fixture.detectChanges()

    expect(within(document.body).queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger())
  })

  it('unmounting the shell with the drawer open returns focus to the element focused before it opened', () => {
    // Focused outside the shell, so the restore target survives the shell's removal (a click
    // through fireEvent does not move focus to the trigger).
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    fixture.destroy()
    // The restore runs after the next render, as every focus move out of a lifecycle hook does.
    TestBed.inject(ApplicationRef).tick()

    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('a backdrop click closes the drawer but a click inside the panel does not', () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    const panel = dialog()

    // Click on a link inside the panel — the panel stops propagation.
    fireEvent.click(within(panel).getByText('Dashboard'))
    fixture.detectChanges()
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    // Click on the fixed backdrop wrapper (the panel's parent).
    const wrapper = panel.parentElement
    if (!wrapper) throw new Error('expected the drawer wrapper')
    fireEvent.click(wrapper)
    fixture.detectChanges()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('the close button closes the drawer', () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    fireEvent.click(within(document.body).getByRole('button', { name: 'Close navigation menu' }))
    fixture.detectChanges()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('Tab wraps from the last link back to the first tab stop (focus trap)', () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    const panel = dialog()
    const links = within(panel).getAllByRole('link')
    const last = links[links.length - 1]
    if (!last) throw new Error('expected the drawer links')
    last.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(closeButton())
  })

  it('Shift+Tab from the first tab stop wraps to the last link', () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    closeButton().focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    const links = within(dialog()).getAllByRole('link')
    expect(document.activeElement).toBe(links[links.length - 1])
  })

  it('closes on SPA navigation so it never covers the next page', async () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    router.navigate('/projects', { replace: true })
    await fixture.whenStable()
    fixture.detectChanges()

    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('closes on a same-route #top navigation — hash-only changes dismiss too', async () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    // The fleet's safe-target pattern appends a hash to the CURRENT path:
    // pathname and search are unchanged, only the hash moves.
    router.navigate('/dashboard#top', { replace: true })
    await fixture.whenStable()
    fixture.detectChanges()

    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('carries the fleet data-mol-id defaults for locators', () => {
    mount(ShellHost)
    expect(document.querySelector('[data-mol-id="shell-root"]')).toBeDefined()
    expect(document.querySelector('[data-mol-id="shell-topbar"]')).toBeDefined()
    expect(trigger().getAttribute('data-mol-id')).toBe('shell-drawer-open')
    expect(document.querySelector('[data-mol-id="shell-content"]')).toBeDefined()
  })
})

describe('ResponsiveAppShell on desktop (>=768px)', () => {
  it('renders the sidebar nav landmarks + content, with no trigger and no drawer', () => {
    setDesktop(true)
    mount(ShellHost)

    const aside = within(document.body).getByRole('complementary')
    expect(aside.getAttribute('data-mol-id')).toBe('shell-sidebar')
    expect(within(aside).getByRole('navigation').getAttribute('aria-label')).toBe(
      'Primary navigation',
    )
    expect(within(aside).getByRole('link', { name: 'Reports' })).toBeDefined()
    expect(within(document.body).getByRole('main')).toBeDefined()

    // Mobile chrome must not exist — the drawer is inert on desktop.
    expect(within(document.body).queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })

  it('does not render the top bar when mobileOnly is set', () => {
    setDesktop(true)
    mount(ShellHost, (instance) => {
      instance.mobileOnlyTopBar = true
    })
    expect(within(document.body).queryByRole('banner')).toBeNull()
  })

  it('still renders the top bar on mobile when mobileOnly is set', () => {
    mount(ShellHost, (instance) => {
      instance.mobileOnlyTopBar = true
    })
    expect(within(document.body).getByRole('banner')).toBeDefined()
  })

  it('applies the sidebarWidth preset to the sidebar geometry', () => {
    setDesktop(true)
    mount(ShellHost, (instance) => {
      instance.sidebarWidth = 'lg'
    })
    expect(within(document.body).getByRole('complementary').style.width).toBe('256px')
  })

  it('accepts an exact pixel sidebarWidth', () => {
    setDesktop(true)
    mount(ShellHost, (instance) => {
      instance.sidebarWidth = 300
    })
    expect(within(document.body).getByRole('complementary').style.width).toBe('300px')
  })
})

describe('ResponsiveAppShell across the breakpoint', () => {
  it('swaps the shell wholesale when the viewport crosses 768px', () => {
    const fixture = mount(ShellHost)
    expect(trigger()).toBeDefined()

    setDesktop(true)
    fireViewportChange()
    fixture.detectChanges()

    expect(within(document.body).queryByRole('complementary')).not.toBeNull()
    expect(within(document.body).queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
    expect(within(document.body).queryByRole('banner')).not.toBeNull()

    setDesktop(false)
    fireViewportChange()
    fixture.detectChanges()

    expect(within(document.body).queryByRole('complementary')).toBeNull()
    expect(trigger()).toBeDefined()
  })

  it('an open drawer closes on desktop-crossing resize and does not resurface back on mobile', async () => {
    const fixture = mount(ShellHost)
    fireEvent.click(trigger())
    fixture.detectChanges()
    expect(within(document.body).getByRole('dialog')).toBeDefined()

    setDesktop(true)
    fireViewportChange()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(within(document.body).queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')

    setDesktop(false)
    fireViewportChange()
    await fixture.whenStable()
    fixture.detectChanges()
    // The logical open state was dropped at the crossing — no surprise drawer.
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })
})

describe('ResponsiveAppShell contract', () => {
  it('exposes the sub-components both as dot-properties and named exports', () => {
    // Angular has no dot-property composition: a consumer names the part
    // classes in the `imports` array. The observable contract is the same —
    // each part is its own exported component class, distinct from the root.
    expect(typeof ResponsiveAppShell).toBe('function')
    expect(typeof ResponsiveAppShellTopBar).toBe('function')
    expect(typeof ResponsiveAppShellSidebar).toBe('function')
    expect(typeof ResponsiveAppShellDrawer).toBe('function')
    expect(typeof ResponsiveAppShellContent).toBe('function')
    expect(
      new Set<unknown>([
        ResponsiveAppShellTopBar,
        ResponsiveAppShellSidebar,
        ResponsiveAppShellDrawer,
        ResponsiveAppShellContent,
      ]).size,
    ).toBe(4)
  })

  it('throws a directive error when a sub-component renders outside the shell', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => mount(OrphanTopBarHost)).toThrow(/must be rendered inside <ResponsiveAppShell>/)
      // A refused mount leaves the module instantiated; reset it so the next
      // orphan composition starts from a fresh test module.
      TestBed.resetTestingModule()
      expect(() => mount(OrphanDrawerHost)).toThrow(/must be rendered inside <ResponsiveAppShell>/)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('hides the menu trigger when no Drawer is composed', () => {
    mount(NoDrawerShellHost)
    expect(within(document.body).queryByRole('button', { name: 'Open navigation menu' })).toBeNull()
  })
})

describe('useIsDesktop', () => {
  /** The rendered value of the composable, as the probe paints it. */
  const desktopProbe = (): string | null | undefined =>
    document.querySelector('[data-mol-id="is-desktop"]')?.textContent

  it('reads matchMedia synchronously on first render and follows change events', () => {
    setDesktop(true)
    const fixture = mount(ProbeHost)
    // No extra flush: the first paint already carries the matchMedia answer.
    expect(desktopProbe()).toBe('true')

    setDesktop(false)
    fireViewportChange()
    fixture.detectChanges()
    expect(desktopProbe()).toBe('false')
  })

  it('returns false (mobile shell) in non-browser environments', () => {
    const original = window.matchMedia
    Reflect.deleteProperty(window, 'matchMedia')
    try {
      mount(ProbeHost)
      expect(desktopProbe()).toBe('false')
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: original,
      })
    }
  })
})

/** A shell whose optional slots a consumer `@if` adds and removes. */
const SlotsShellHost = Component({
  selector: 'mol-spec-shell-slots-host',
  standalone: true,
  imports: [
    ResponsiveAppShell,
    ResponsiveAppShellTopBar,
    ResponsiveAppShellSidebar,
    ResponsiveAppShellDrawer,
    ResponsiveAppShellContent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-responsive-app-shell>
    <header mol-responsive-app-shell-topbar>
      @if (on) {<span slot="brand" data-slot>Brand</span>}@if (on) {<b slot="actions" data-slot>Act</b>}
    </header>
    <aside mol-responsive-app-shell-sidebar>
      <a href="/a">A</a>@if (on) {<i slot="footer" data-slot>Side footer</i>}
    </aside>
    <mol-responsive-app-shell-drawer
      ><a href="/a">A</a>@if (on) {<i slot="header" data-slot>Head</i>}@if (on) {<i slot="footer" data-slot>Foot</i>}</mol-responsive-app-shell-drawer
    >
    <main mol-responsive-app-shell-content></main>
  </div>`,
})(
  class SpecShellSlotsHost {
    /** Whether the consumer renders the optional slots. */
    on = false
  },
)

/**
 * Sets whether the consumer renders the optional slots, and renders it.
 *
 * @param fixture - The mounted slots host.
 * @param on - The new value.
 */
function setSlots(fixture: ComponentFixture<{ on: boolean }>, on: boolean): void {
  fixture.componentInstance.on = on
  fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck()
  fixture.componentRef.injector.get(ApplicationRef).tick()
}

describe('ResponsiveAppShell optional slots', () => {
  it('adds and removes the top bar brand and actions wrappers and the sidebar footer with the consumer @if (desktop)', () => {
    setDesktop(true)
    const fixture = mount(SlotsShellHost) as ComponentFixture<{ on: boolean }>
    const banner = within(document.body).getByRole('banner')
    const aside = within(document.body).getByRole('complementary')
    const emptyBanner = banner.innerHTML
    const emptyAside = aside.innerHTML
    for (let round = 0; round < 2; round++) {
      setSlots(fixture, true)
      expect(banner.querySelectorAll('[data-slot]')).toHaveLength(2)
      for (const slot of banner.querySelectorAll('[data-slot]')) {
        // React: `{brand && <div>{brand}</div>}` — the wrapper is the slot's parent.
        expect(slot.parentElement!.parentElement).not.toBe(null)
        expect(slot.parentElement).not.toBe(banner)
      }
      expect(aside.querySelector('[data-slot]')!.parentElement!.parentElement).toBe(aside)
      setSlots(fixture, false)
      expect(banner.innerHTML).toBe(emptyBanner)
      expect(aside.innerHTML).toBe(emptyAside)
    }
  })

  it('adds and removes the drawer header and footer wrappers with the consumer @if (mobile)', () => {
    const fixture = mount(SlotsShellHost) as ComponentFixture<{ on: boolean }>
    fireEvent.click(trigger())
    fixture.componentRef.injector.get(ApplicationRef).tick()
    const empty = dialog().innerHTML
    for (let round = 0; round < 2; round++) {
      setSlots(fixture, true)
      // Each in its own wrapper, outside the nav (React: `{header && <div>{header}</div>}`).
      for (const text of ['Head', 'Foot']) {
        const slot = within(dialog()).getByText(text)
        expect(slot.closest('nav')).toBeNull()
        expect(slot.parentElement).not.toBe(dialog())
      }
      setSlots(fixture, false)
      expect(dialog().innerHTML).toBe(empty)
    }
  })
})
