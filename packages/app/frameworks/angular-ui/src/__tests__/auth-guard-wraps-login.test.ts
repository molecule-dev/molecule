// @vitest-environment jsdom
/**
 * An AuthGuard that wraps the whole route tree, login page included, must
 * redirect once and then render the login page.
 *
 * Port of `@molecule/app-ui-react/src/__tests__/auth-guard-wraps-login.test.tsx`.
 * React pins this with a render count of the routed content; Angular has no
 * commit of its own, so the same defect (a redirect loop) shows as repeated
 * navigations and is asserted as exactly one.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import { Component, provideZonelessChangeDetection, signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import type { RouteLocation } from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'

/** Navigation options the guard passes (a subset of the routing contract). */
interface NavigateOptions {
  /** Whether the navigation replaces the current entry. */
  replace?: boolean
  /** State recorded with the entry. */
  state?: unknown
}

/**
 * Controls the mocked binding's router. `vi.hoisted` runs before the imports
 * load, so the factory below fills these in.
 */
const controls = vi.hoisted(() => ({
  /** Puts the mocked router on a path. */
  reset: (_path: string) => {},
  /** Every `navigate` call, in order. */
  navigations: [] as { path: string; options?: NavigateOptions }[],
}))

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  const location = signal<RouteLocation>({ pathname: '/', search: '', hash: '' })
  controls.reset = (path) => {
    location.set({ pathname: path, search: '', hash: '' })
  }
  return {
    ...actual,
    useAuth: () => ({ status: signal('unauthenticated'), isAuthenticated: signal(false) }),
    useRouter: () => ({
      location,
      params: signal({}),
      query: signal({}),
      navigate: (path: string, options?: NavigateOptions) => {
        controls.navigations.push({ path, options })
        controls.reset(path.split(/[?#]/)[0] ?? '/')
      },
      navigateTo: () => {},
      back: () => {},
      forward: () => {},
      isActive: (path: string) => location().pathname === path,
    }),
    useTranslation: () => ({
      t: (_key: string, _values: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? '',
    }),
  }
})

const { AuthGuard } = await import('../components/auth-guard.component.js')
const { useRouter } = await import('@molecule/app-angular')

/** Host wrapping the routed tree, with the login page inside the guard. */
const GuardHost = Component({
  selector: 'div[data-wrapped-host]',
  standalone: true,
  imports: [AuthGuard],
  template: `<mol-auth-guard [loginPath]="loginPath">
    <p data-testid="page">{{ pageText() }}</p>
    <p data-testid="where">{{ pathname() }}</p>
  </mol-auth-guard>`,
})(
  class GuardHostComponent {
    private readonly router = useRouter()
    loginPath?: string

    /** The current pathname. */
    pathname(): string {
      return this.router.location().pathname
    }

    /** The page the current route shows. */
    pageText(): string {
      const pathname = this.pathname()
      if (pathname === '/login') return 'login page'
      if (pathname === '/signin') return 'signin page'
      return 'protected page'
    }
  },
)

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

beforeEach(() => {
  controls.reset('/')
  controls.navigations = []
})

/**
 * Renders the guard around the routed tree at a path.
 *
 * @param initial - The starting path.
 * @param loginPath - The guard's custom login path, when the case sets one.
 * @returns The fixture and the element holding the routed content.
 */
function renderWrapped(initial: string, loginPath?: string): ComponentFixture<unknown> {
  controls.reset(initial)
  TestBed.configureTestingModule({
    imports: [GuardHost],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(GuardHost)
  fixture.componentInstance.loginPath = loginPath
  fixture.detectChanges()
  return fixture
}

/** The text of the routed page, or `null` when it is not rendered. */
const pageText = (): string | null =>
  document.querySelector('[data-testid="page"]')?.textContent ?? null

/** The pathname the routed content reports. */
const wherePathname = (): string | null =>
  document.querySelector('[data-testid="where"]')?.textContent ?? null

describe('AuthGuard around the login route', () => {
  it('redirects once to the login path and renders the login page', () => {
    const fixture = renderWrapped('/')
    // The redirect's navigation changes the location signal; the next change
    // detection renders the login page (a loop would navigate again).
    fixture.detectChanges()

    expect(pageText()).toBe('login page')
    expect(pageText()).not.toBe('protected page')
    expect(wherePathname()).toBe('/login')
    expect(controls.navigations.map((call) => call.path)).toEqual(['/login'])
  })

  it('compares only the pathname of a login path with a query', () => {
    const fixture = renderWrapped('/', '/signin?next=%2F')
    fixture.detectChanges()

    expect(pageText()).toBe('signin page')
    expect(wherePathname()).toBe('/signin')
    expect(controls.navigations.map((call) => call.path)).toEqual(['/signin?next=%2F'])
  })
})
