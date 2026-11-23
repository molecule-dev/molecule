// @vitest-environment jsdom
/**
 * Render tests for the close-on-route-change behavior shared by the overlay
 * components (`UserMenu`, `SidebarUserCard`, `Dropdown`) — Angular port of
 * `@molecule/app-ui-react/src/__tests__/overlay-route-close.test.tsx`: opening
 * the overlay and then changing the route must dismiss it (an overlay left
 * mounted over the next page blocks clicks underneath).
 *
 * Angular forces the translation: a route change is a real navigation the
 * injected router notifies (React re-renders with a new `useLocation`), and the
 * overlay follows it through its own route effect.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import {
  provideDomPlacement,
  provideRouter,
  type RouteLocation,
  type Router,
} from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the overlay templates CALL; every other token is read as a plain
    // string by the `[class]` bindings.
    const CALLABLE = new Set([
      'cn',
      'button',
      'flex',
      'fontWeight',
      'h',
      'minH',
      'minW',
      'modal',
      'sp',
      'textSize',
      'w',
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
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

// Only the auth identity is stubbed: the router helpers the overlays follow
// are the real ones, provided through `provideRouter` below.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  return {
    ...actual,
    useAuth: () => ({ user: () => ({ id: 'u1', name: 'Ada', email: 'ada@example.com' }) }),
  }
})

// The overlays read `t` through the bonded i18n provider; no translations are
// registered, so every label falls back to its own `defaultValue`.
setProvider(createSimpleI18nProvider())

const { UserMenu } = await import('../components/user-menu.component.js')
const { SidebarUserCard } = await import('../components/sidebar-user-card.component.js')
const { Dropdown } = await import('../components/dropdown.component.js')
const { usePanelClose } = await import('../components/panel-close.component.js')

/** A memory router whose location the overlays follow. */
interface MemoryRouter {
  /** The router instance the overlays follow. */
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
  /** Notifies every subscriber, like a real navigation. */
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

/** The UserMenu with a panel body. */
const UserMenuHost = Component({
  selector: 'mol-spec-user-menu-host',
  standalone: true,
  imports: [UserMenu],
  template: `<mol-user-menu><div data-mol-id="panel-body">panel</div></mol-user-menu>`,
})(class SpecUserMenuHost {})

/** The account card with a panel body. */
const SidebarHost = Component({
  selector: 'mol-spec-sidebar-host',
  standalone: true,
  imports: [SidebarUserCard],
  template: `<mol-sidebar-user-card><div>sidebar-panel</div></mol-sidebar-user-card>`,
})(class SpecSidebarHost {})

/** Panel content that dismisses its own drawer through `usePanelClose`. */
const ClosingPanel = Component({
  selector: 'mol-spec-closing-panel',
  standalone: true,
  template: `<button type="button" (click)="dismiss()">dismiss</button>`,
})(
  class SpecClosingPanel {
    /** The enclosing drawer's close callback. */
    private readonly closeDrawer = usePanelClose()

    /** Closes the drawer from inside the panel. */
    dismiss(): void {
      this.closeDrawer()
    }
  },
)

/** The UserMenu with a closing panel body. */
const PanelHost = Component({
  selector: 'mol-spec-panel-host',
  standalone: true,
  imports: [UserMenu, ClosingPanel],
  template: `<mol-user-menu><mol-spec-closing-panel></mol-spec-closing-panel></mol-user-menu>`,
})(class SpecPanelHost {})

/** The dropdown with a trigger whose click opens it. */
const DropdownHost = Component({
  selector: 'mol-spec-dropdown-host',
  standalone: true,
  imports: [Dropdown],
  template: `<mol-dropdown [items]="items"
    ><button slot="trigger" type="button">Open menu</button></mol-dropdown
  >`,
})(
  class SpecDropdownHost {
    /** The menu items. */
    items = [{ label: 'Item A', value: 'a' }]
  },
)

/**
 * Mounts a host with a router every overlay follows.
 *
 * @param host - The host component to mount.
 * @param router - The router to provide.
 * @returns The fixture.
 */
function render<T>(host: Type<T>, router: Router): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const fixture = TestBed.createComponent(host)
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

describe('UserMenu — close on route change', () => {
  it('dismisses the open drawer when the route changes', async () => {
    const router = memoryRouter('/')
    const fixture = render(UserMenuHost, router.router)
    // Drawer is closed initially.
    expect(within(document.body).queryByText('panel')).toBeNull()
    // Open it.
    fireEvent.click(within(fixture.nativeElement).getByRole('button'))
    fixture.detectChanges()
    expect(within(document.body).getByText('panel')).toBeDefined()
    // Navigate — the route effect must close the drawer.
    router.navigate('/settings')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(within(document.body).queryByText('panel')).toBeNull()
  })
})

describe('SidebarUserCard — close on route change', () => {
  it('dismisses the open drawer when the route changes', async () => {
    const router = memoryRouter('/')
    const fixture = render(SidebarHost, router.router)
    fireEvent.click(within(fixture.nativeElement).getByRole('button'))
    fixture.detectChanges()
    expect(within(document.body).getByText('sidebar-panel')).toBeDefined()
    router.navigate('/profile')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(within(document.body).queryByText('sidebar-panel')).toBeNull()
  })
})

describe('usePanelClose — panel content dismisses its drawer', () => {
  it('lets UserMenu panel children close the drawer via context', async () => {
    const router = memoryRouter('/')
    const fixture = render(PanelHost, router.router)
    // Open the drawer, then close it from inside the panel.
    fireEvent.click(within(fixture.nativeElement).getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    expect(within(document.body).getByText('dismiss')).toBeDefined()
    fireEvent.click(within(document.body).getByText('dismiss'))
    fixture.detectChanges()
    expect(within(document.body).queryByText('dismiss')).toBeNull()
  })
})

describe('Dropdown — close on route change', () => {
  it('dismisses the open menu when the route changes', async () => {
    const router = memoryRouter('/')
    const fixture = render(DropdownHost, router.router)
    fireEvent.click(within(fixture.nativeElement).getByText('Open menu'))
    fixture.detectChanges()
    expect(within(document.body).getByText('Item A')).toBeDefined()
    router.navigate('/elsewhere')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(within(document.body).queryByText('Item A')).toBeNull()
  })
})
