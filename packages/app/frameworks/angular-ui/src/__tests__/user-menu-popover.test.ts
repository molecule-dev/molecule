// @vitest-environment jsdom
/**
 * Render tests for the `UserMenuPopover` inline-popover account-menu family —
 * Angular port of
 * `@molecule/app-ui-react/src/__tests__/user-menu-popover.test.tsx`: the
 * trigger shows the resolved identity and toggles the panel, the panel renders
 * the identity header plus nav children only while open, the disclosure
 * contract is `aria-expanded` + `aria-controls` (not `aria-haspopup="menu"`),
 * sign-out closes and logs out, the popover dismisses on a route change, and a
 * nav child can close it through `useUserMenuPopoverClose`.
 *
 * Angular forces the translation: the family is a set of standalone directive
 * components projected into their root instead of React children reading a
 * context, an open/close toggle is a signal plus a `detectChanges()` pass
 * instead of a re-render, and a route change is a real navigation the injected
 * router notifies (React re-renders with a new `useLocation` value).
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
  type Type,
} from '@angular/core'
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

// A mutable auth state the mocked `useAuth` reports; tests swap it to exercise
// the guest fallback.
const mockAuth: { user: { name?: string | null; email?: string | null } | null } = {
  user: { name: 'Ada Lovelace', email: 'ada@example.com' },
}

const mockLogout = vi.fn(() => Promise.resolve())

// Only the auth identity and action are stubbed: the router and translation
// helpers the family follows are the real ones (a provided router + the bonded
// i18n provider below).
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  return {
    ...actual,
    useAuth: () => ({ user: () => mockAuth.user, logout: mockLogout }),
  }
})

vi.mock('@molecule/app-ui', async (importOriginal) => {
  /**
   * The ClassMap stand-in: tokens the templates CALL resolve to functions,
   * every other token to its own name (Angular's class binding rejects
   * function values).
   *
   * @returns The proxied ClassMap.
   */
  const getClassMap = (): unknown => {
    const CALLABLE = new Set([
      'cn',
      'flex',
      'fontWeight',
      'h',
      'minW',
      'position',
      'sp',
      'stack',
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
  }
  return { ...(await importOriginal<Record<string, unknown>>()), getClassMap }
})

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

// The family reads `t` through the bonded i18n provider; no translations are
// registered, so every label falls back to its own `defaultValue`.
setProvider(createSimpleI18nProvider())

const {
  UserMenuPopover,
  UserMenuPopoverTrigger,
  UserMenuPopoverPanel,
  UserMenuPopoverSignOut,
  useUserMenuPopoverClose,
} = await import('../components/user-menu-popover.component.js')

/** A memory router whose location the popover follows. */
interface MemoryRouter {
  /** The router instance the popover follows. */
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

/** The popover with a trigger and a panel holding one nav link. */
const BasicHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-popover-basic',
  standalone: true,
  imports: [UserMenuPopover, UserMenuPopoverTrigger, UserMenuPopoverPanel],
  template: `<div mol-user-menu-popover>
    <button mol-user-menu-popover-trigger></button>
    <div mol-user-menu-popover-panel><a href="/settings">Settings</a></div>
  </div>`,
})(class SpecPopoverBasicHost {})

/** The popover whose guest label is supplied by its owner. */
const GuestHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-popover-guest',
  standalone: true,
  imports: [UserMenuPopover, UserMenuPopoverTrigger, UserMenuPopoverPanel],
  template: `<div mol-user-menu-popover guestName="Analyst">
    <button mol-user-menu-popover-trigger></button>
    <div mol-user-menu-popover-panel>x</div>
  </div>`,
})(class SpecPopoverGuestHost {})

/** The popover with a nav link and the sign-out item in its panel. */
const SignOutHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-popover-sign-out',
  standalone: true,
  imports: [UserMenuPopover, UserMenuPopoverTrigger, UserMenuPopoverPanel, UserMenuPopoverSignOut],
  template: `<div mol-user-menu-popover>
    <button mol-user-menu-popover-trigger></button>
    <div mol-user-menu-popover-panel>
      <a href="/settings">Settings</a>
      <button mol-user-menu-popover-sign-out></button>
    </div>
  </div>`,
})(class SpecPopoverSignOutHost {})

/** Panel content that closes its own popover through `useUserMenuPopoverClose`. */
const ClosingLink = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-popover-closing-link',
  standalone: true,
  template: `<button type="button" (click)="close()">go</button>`,
})(
  class SpecPopoverClosingLink {
    /** The enclosing popover's close callback. */
    private readonly closePopover = useUserMenuPopoverClose()

    /** Closes the popover from inside the panel. */
    close(): void {
      this.closePopover()
    }
  },
)

/** The popover with a nav child that dismisses it. */
const ClosingHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-popover-closing',
  standalone: true,
  imports: [UserMenuPopover, UserMenuPopoverTrigger, UserMenuPopoverPanel, ClosingLink],
  template: `<div mol-user-menu-popover>
    <button mol-user-menu-popover-trigger></button>
    <div mol-user-menu-popover-panel>
      <mol-spec-popover-closing-link></mol-spec-popover-closing-link>
    </div>
  </div>`,
})(class SpecPopoverClosingHost {})

/**
 * Mounts a host with a router the popover follows.
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
  mockAuth.user = { name: 'Ada Lovelace', email: 'ada@example.com' }
  mockLogout.mockClear()
})

describe('UserMenuPopoverTrigger', () => {
  it('renders the initials, display name, and email and toggles the panel', () => {
    const router = memoryRouter('/')
    const fixture = render(BasicHost, router.router)
    const body = within(document.body)
    // Trigger shows resolved identity; panel is closed initially.
    expect(body.getByText('AL')).toBeDefined()
    expect(body.getByText('Ada Lovelace')).toBeDefined()
    expect(body.getByText('ada@example.com')).toBeDefined()
    expect(body.queryByText('Settings')).toBeNull()
    // Open it.
    fireEvent.click(body.getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    expect(body.getByText('Settings')).toBeDefined()
    // Toggle closed again.
    fireEvent.click(body.getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    expect(body.queryByText('Settings')).toBeNull()
  })

  it('falls back to the guest label when there is no auth user', () => {
    mockAuth.user = null
    const router = memoryRouter('/')
    render(GuestHost, router.router)
    expect(within(document.body).getByText('Analyst')).toBeDefined()
  })
})

describe('UserMenuPopoverPanel', () => {
  it('renders the identity header and nav children only while open', () => {
    const router = memoryRouter('/')
    const fixture = render(SignOutHost, router.router)
    const body = within(document.body)
    fireEvent.click(body.getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    // The panel is a disclosure (a plain toggled region), not role="menu" —
    // it renders a header + a `<nav>` of arbitrary links, which is invalid
    // content for role="menu" (that role may contain ONLY menuitem
    // descendants). The nav landmark is still there, correctly labelled.
    expect(body.getByRole('navigation', { name: 'Account menu' })).toBeDefined()
    expect(body.queryByRole('menu')).toBeNull()
    expect(body.getByText('Settings')).toBeDefined()
    expect(body.getByText('Sign out')).toBeDefined()
  })

  it('is linked to the trigger via aria-expanded + aria-controls (not aria-haspopup="menu")', () => {
    const router = memoryRouter('/')
    const fixture = render(BasicHost, router.router)
    const body = within(document.body)
    const trigger = body.getByRole('button', { name: 'Open user menu' })
    expect(trigger.getAttribute('aria-haspopup')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    fireEvent.click(trigger)
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // The referenced id resolves to the actual rendered panel.
    expect(document.getElementById(controlsId as string)).toBe(
      body.getByRole('navigation', { name: 'Account menu' }).parentElement,
    )
  })

  it('is one card element beside the trigger while open and no element at all while closed, through every reopen', () => {
    const router = memoryRouter('/')
    const fixture = render(BasicHost, router.router)
    const body = within(document.body)
    const root = (fixture.nativeElement as HTMLElement).firstElementChild as HTMLElement
    const trigger = body.getByRole('button', { name: 'Open user menu' })
    /** The root's element children: `b` for the trigger, `p` for the card. */
    const children = (): string =>
      Array.from(root.children)
        .map((el) =>
          el === trigger
            ? 'b'
            : el.getAttribute('data-mol-id') === 'user-menu-panel'
              ? 'p'
              : el.tagName,
        )
        .join(' ')
    for (let round = 0; round < 2; round++) {
      expect(children()).toBe('b')
      fireEvent.click(trigger)
      fixture.detectChanges()
      expect(children()).toBe('b p')
      const card = root.lastElementChild as HTMLElement
      expect(card.id).toBe(trigger.getAttribute('aria-controls'))
      expect(card.className).toBe('userMenuPopoverPanel')
      expect(card.firstElementChild?.tagName).toBe('HEADER')
      fireEvent.click(trigger)
      fixture.detectChanges()
    }
    expect(children()).toBe('b')
  })
})

describe('UserMenuPopoverSignOut', () => {
  it('closes the panel and calls auth.logout', () => {
    const router = memoryRouter('/')
    const fixture = render(SignOutHost, router.router)
    const body = within(document.body)
    fireEvent.click(body.getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    fireEvent.click(body.getByText('Sign out'))
    fixture.detectChanges()
    expect(mockLogout).toHaveBeenCalledOnce()
    expect(body.queryByText('Sign out')).toBeNull()
  })
})

describe('UserMenuPopover — close on route change', () => {
  it('dismisses the open panel when the route changes', async () => {
    const router = memoryRouter('/')
    const fixture = render(BasicHost, router.router)
    const body = within(document.body)
    fireEvent.click(body.getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    expect(body.getByText('Settings')).toBeDefined()
    router.navigate('/dashboard')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(body.queryByText('Settings')).toBeNull()
  })
})

describe('useUserMenuPopoverClose', () => {
  it('lets a nav child close the popover', () => {
    const router = memoryRouter('/')
    const fixture = render(ClosingHost, router.router)
    const body = within(document.body)
    fireEvent.click(body.getByRole('button', { name: 'Open user menu' }))
    fixture.detectChanges()
    expect(body.getByText('go')).toBeDefined()
    fireEvent.click(body.getByText('go'))
    fixture.detectChanges()
    expect(body.queryByText('go')).toBeNull()
  })
})
