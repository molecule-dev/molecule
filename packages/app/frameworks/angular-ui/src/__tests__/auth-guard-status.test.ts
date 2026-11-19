// @vitest-environment jsdom
/**
 * AuthGuard decides from the auth status, not `initialized`.
 *
 * Port of `@molecule/app-ui-react/src/__tests__/auth-guard-status.test.tsx`:
 * a stored token AND user make the FIRST render `'authenticated'`, so a
 * protected page paints immediately instead of waiting for a background
 * verification; `'unavailable'` (a retained candidate the server could not
 * confirm) still renders the page; only `'loading'` shows the fallback; and a
 * decided signed-out visitor is redirected to the login path.
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
import type { AuthState } from '@molecule/app-auth'

/** Navigation options the guard passes (a subset of the routing contract). */
interface NavigateOptions {
  /** Whether the navigation replaces the current entry. */
  replace?: boolean
  /** State recorded with the entry. */
  state?: unknown
}

/**
 * Controls the mocked binding's auth status and router. `vi.hoisted` runs
 * before the imports load, so the factory below (which creates the signals)
 * fills these in.
 */
const controls = vi.hoisted(() => ({
  /** Sets the mocked session status and its `isAuthenticated`. */
  setStatus: (_status: AuthState['status'], _authenticated: boolean) => {},
  /** Puts the mocked router on a path. */
  reset: (_path: string) => {},
  /** Every `navigate` call, in order. */
  navigations: [] as { path: string; options?: NavigateOptions }[],
}))

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppAngular>()
  const status = signal<AuthState['status']>('authenticated')
  const authenticated = signal(true)
  const location = signal<RouteLocation>({ pathname: '/', search: '', hash: '' })
  controls.setStatus = (next, isAuthenticated) => {
    status.set(next)
    authenticated.set(isAuthenticated)
  }
  controls.reset = (path) => {
    location.set({ pathname: path, search: '', hash: '' })
  }
  return {
    ...actual,
    useAuth: () => ({
      status,
      state: signal({ status: status(), authenticated: authenticated(), user: null }),
      user: signal(null),
      isAuthenticated: authenticated,
      isLoading: signal(status() === 'loading'),
    }),
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

/** Host projecting the routed page into the real guard. */
const GuardHost = Component({
  selector: 'div[data-guard-host]',
  standalone: true,
  imports: [AuthGuard],
  template: `<mol-auth-guard><p>{{ pageText() }}</p></mol-auth-guard>`,
})(
  class GuardHostComponent {
    private readonly router = useRouter()

    /** The page the current location shows. */
    pageText(): string {
      return this.router.location().pathname === '/login' ? 'login page' : 'protected page'
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
  controls.setStatus('authenticated', true)
  controls.navigations = []
})

/**
 * Renders the guard at `/` with the mocked binding.
 *
 * @returns The TestBed fixture.
 */
function renderGuard(): ComponentFixture<unknown> {
  TestBed.configureTestingModule({
    imports: [GuardHost],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(GuardHost)
  fixture.detectChanges()
  return fixture
}

describe('AuthGuard reads the session status (xr-molecule-flash-m177)', () => {
  it('renders the page when a restored session is authenticated before `initialized`', () => {
    // The optimistic restore: a stored token AND user are the session, and the
    // first render must not wait for a background verification.
    renderGuard()

    expect(document.body.textContent).toContain('protected page')
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
  })

  it('renders the page while the session is `unavailable` (stored, unconfirmed)', () => {
    controls.setStatus('unavailable', false)

    renderGuard()

    expect(document.body.textContent).toContain('protected page')
  })

  it('shows the loading fallback only while the status is `loading`', () => {
    controls.setStatus('loading', false)

    renderGuard()

    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).not.toBeNull()
    expect(document.body.textContent).not.toContain('protected page')
    expect(document.body.textContent).not.toContain('login page')
  })

  it('redirects an unauthenticated visitor to the login path', () => {
    controls.setStatus('unauthenticated', false)

    renderGuard()

    expect(document.body.textContent).toContain('login page')
    expect(document.body.textContent).not.toContain('protected page')
    expect(controls.navigations.map((call) => call.path)).toEqual(['/login'])
    // React renders `<Navigate replace>`, keeping the attempted location in state.
    expect(controls.navigations[0]?.options?.replace).toBe(true)
  })
})
