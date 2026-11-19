// @vitest-environment jsdom

/**
 * Angular port of React's `useVerifyPaymentReturn.test.tsx`. Every title is
 * React's; the framework-forced mechanics change: the hook is called once in
 * an injection context (a component field initializer) instead of on every
 * render, its effect re-runs on the auth state signal instead of a render, its
 * `mounted` ref is the component's `DestroyRef`, and signals replace the
 * returned state values. React-only mechanisms translate to what a caller
 * observes: `rerender()` becomes an explicit change-detection pass, `unmount()`
 * becomes `fixture.destroy()`, and StrictMode (which does not exist here) keeps
 * the one construction its double-invoke was meant to survive.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { setProvider as setLoggerProvider } from '@molecule/app-logger'

import {
  createTestAuthClient,
  createTestHttpClient,
  createTestLogger,
  createTestLoggerProvider,
  testHttpResponse,
} from '../../__tests__/helpers/test-providers.js'
import { provideAuth, provideHttp } from '../../providers.js'
import {
  useVerifyPaymentReturn,
  type UseVerifyPaymentReturnOptions,
  type UseVerifyPaymentReturnResult,
} from '../use-verify-payment-return.js'

/** The profile this suite stands in for. */
type TestUser = { id: string; email: string }

/** The signed-in buyer every case starts from. */
const DEFAULT_USER: TestUser = { id: 'user_1', email: 'buyer@example.com' }

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe reads (auth and http).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * A minimal auth client exposing the pieces `useAuth` reads.
 *
 * @param options - Whether auth has hydrated, and the signed-in user.
 * @returns The stub client.
 */
function makeAuthClient(
  options: { initialized?: boolean; user?: TestUser | null } = {},
): AuthClient<TestUser> {
  const { initialized = true, user = DEFAULT_USER } = options
  const client = createTestAuthClient<TestUser>()
  const state: AuthState<TestUser> = {
    status: initialized ? (user ? 'authenticated' : 'unauthenticated') : 'loading',
    initialized,
    authenticated: !!user,
    user: user ?? null,
    loading: false,
    error: null,
  }
  vi.mocked(client.getState).mockReturnValue(state)
  vi.mocked(client.refresh).mockResolvedValue({ user: user ?? DEFAULT_USER, accessToken: 'token' })
  return client
}

/**
 * Points the jsdom address bar at a checkout-return URL.
 *
 * @param search - The query string to set (including `?`).
 */
function setSearch(search: string): void {
  window.history.replaceState({}, '', `/plan-updated${search}`)
}

/**
 * Polls until the predicate holds, flushing change detection and timers.
 *
 * @param fixture - The mounted probe whose effect may still be settling.
 * @param predicate - The condition to wait for.
 * @param description - What the wait is for, used in the timeout message.
 */
async function waitFor(
  fixture: ComponentFixture<unknown>,
  predicate: () => boolean,
  description: string,
): Promise<void> {
  const deadline = Date.now() + 2000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/**
 * Polls until the predicate holds without touching the (possibly destroyed)
 * fixture.
 *
 * @param predicate - The condition to wait for.
 * @param description - What the wait is for, used in the timeout message.
 */
async function waitUntil(predicate: () => boolean, description: string): Promise<void> {
  const deadline = Date.now() + 2000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`)
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/**
 * Mounts a probe that calls `useVerifyPaymentReturn` in an injection context.
 *
 * @param options - The function's options.
 * @param client - The auth client to provide.
 * @param http - The http client to provide.
 * @returns The fixture and the function's result.
 */
function mountVerify(
  options: UseVerifyPaymentReturnOptions,
  client: AuthClient<TestUser>,
  http: HttpClient,
): { fixture: ComponentFixture<unknown>; result: UseVerifyPaymentReturnResult } {
  /** Host whose only job is to call the function where injection works. */
  @Component({ selector: 'app-test-verify-payment-return', template: '' })
  class VerifyPaymentReturnProbe {
    readonly result = useVerifyPaymentReturn(options)
  }

  const fixture = mount(VerifyPaymentReturnProbe, provideAuth(client), provideHttp(http))
  return { fixture, result: fixture.componentInstance.result }
}

/**
 * Bonds a logger provider whose `warn` spy the test asserts on.
 *
 * @returns The `warn` spy.
 */
function bondLogger(): Mock<(message: string, ...args: unknown[]) => void> {
  const logger = createTestLogger()
  setLoggerProvider(createTestLoggerProvider(logger))
  return vi.mocked(logger.warn)
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useVerifyPaymentReturn', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('verifies the purchase named by the return URL, from the app origin', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_123')
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()
    const refresh = vi.mocked(client.refresh)

    const { fixture, result } = mountVerify({}, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(vi.mocked(http.post)).toHaveBeenCalledWith('/users/user_1/verify-payment/stripe', {
      subscriptionId: 'cs_live_123',
    })
    // The cached profile still says "free" until it is re-read.
    expect(refresh).toHaveBeenCalled()
  })

  // PayPal appends its own parameter names to the return URL.
  it.each([
    ['?provider=paypal&subscription_id=I-ABC', 'paypal', 'I-ABC'],
    ['?provider=paypal&token=EC-9GH', 'paypal', 'EC-9GH'],
    ['?provider=stripe&session_id=cs_live_456', 'stripe', 'cs_live_456'],
  ])('reads the provider id from %s', async (search, provider, id) => {
    setSearch(search)
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', `/users/user_1/verify-payment/${provider}`),
    )
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({}, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(vi.mocked(http.post)).toHaveBeenCalledWith(`/users/user_1/verify-payment/${provider}`, {
      subscriptionId: id,
    })
  })

  it('stays verified and logs when the profile refresh after payment fails', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const warn = bondLogger()
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()
    vi.mocked(client.refresh).mockRejectedValueOnce(new Error('network down'))

    const { fixture, result } = mountVerify({}, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(warn).toHaveBeenCalledWith('Refreshing the profile after payment failed', {
      error: expect.objectContaining({ message: 'network down' }),
    })
  })

  it('stays idle and issues no request on a normal page visit', async () => {
    const http = createTestHttpClient()
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({}, client, http)

    await fixture.whenStable()
    expect(result.status()).toBe('idle')
    expect(result.isReturn()).toBe(false)
    expect(vi.mocked(http.post)).not.toHaveBeenCalled()
  })

  // After the redirect the page is a cold load: the bearer token is gone and
  // the session is still being restored from the httpOnly cookie. Verifying
  // before that lands would send the request unauthenticated.
  it('waits for auth to hydrate before verifying', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const http = createTestHttpClient()
    const client = makeAuthClient({ initialized: false, user: null })

    const { fixture, result } = mountVerify({}, client, http)

    await fixture.whenStable()
    expect(result.status()).toBe('idle')
    expect(vi.mocked(http.post)).not.toHaveBeenCalled()
  })

  it('reports a failure and can retry it', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_fail')
    const http = createTestHttpClient()
    vi.mocked(http.post)
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValue(testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'))
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({}, client, http)

    await waitFor(fixture, () => result.status() === 'failed', 'failed')
    expect(result.error()?.message).toBe('502')

    result.retry()

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(vi.mocked(http.post)).toHaveBeenCalledTimes(2)
  })

  it('verifies once per transaction even as auth state settles', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_once')
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({}, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    await fixture.whenStable()

    expect(vi.mocked(http.post)).toHaveBeenCalledTimes(1)
  })

  // A reload (or a shared link) must not re-run a purchase verification.
  it('drops the provider parameters from the URL once verified', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_clean&utm_source=email')
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({}, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(window.location.search).toBe('?utm_source=email')
  })

  it('keeps the URL intact when cleanUrl is disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_keep')
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({ cleanUrl: false }, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(window.location.search).toBe('?provider=stripe&sessionId=cs_live_keep')
  })

  it('uses the provider option when the URL names none', async () => {
    setSearch('?sessionId=cs_live_opt')
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({ provider: 'stripe' }, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(vi.mocked(http.post)).toHaveBeenCalledWith('/users/user_1/verify-payment/stripe', {
      subscriptionId: 'cs_live_opt',
    })
  })

  it('does nothing when disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_off')
    const http = createTestHttpClient()
    const client = makeAuthClient()

    const { fixture, result } = mountVerify({ enabled: false }, client, http)

    await fixture.whenStable()
    expect(result.status()).toBe('idle')
    expect(vi.mocked(http.post)).not.toHaveBeenCalled()
  })
})

describe('useVerifyPaymentReturn after unmount', () => {
  beforeEach(() => {
    setSearch('?provider=stripe&sessionId=cs_live_9')
  })

  it('refreshes the profile, but calls no callback and leaves the next page URL alone', async () => {
    let answer: (value: HttpResponse<unknown>) => void = () => {}
    const http = createTestHttpClient()
    vi.mocked(http.post).mockImplementation(
      () =>
        new Promise<HttpResponse<unknown>>((resolve) => {
          answer = resolve
        }),
    )
    const client = makeAuthClient()
    const refresh = vi.mocked(client.refresh)
    const onVerified = vi.fn()

    const { fixture } = mountVerify({ onVerified }, client, http)

    await waitFor(
      fixture,
      () => vi.mocked(http.post).mock.calls.length === 1,
      'the verification request',
    )
    fixture.destroy()
    // The buyer has moved on to another page by the time the request settles.
    window.history.replaceState({ page: 'next' }, '', '/next?tab=2&provider=stripe&sessionId=x')

    answer(testHttpResponse({}, 'POST', '/'))
    await waitUntil(() => refresh.mock.calls.length === 1, 'the profile refresh')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(onVerified).not.toHaveBeenCalled()
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/next?tab=2&provider=stripe&sessionId=x',
    )
    expect(window.history.state).toEqual({ page: 'next' })
  })

  it('logs a failure that settles after unmount instead of calling onError', async () => {
    const warn = bondLogger()
    let fail: (reason?: unknown) => void = () => {}
    const http = createTestHttpClient()
    vi.mocked(http.post).mockImplementation(
      () =>
        new Promise<HttpResponse<unknown>>((_resolve, reject) => {
          fail = reject
        }),
    )
    const client = makeAuthClient()
    const onError = vi.fn()

    const { fixture } = mountVerify({ onError }, client, http)

    await waitFor(
      fixture,
      () => vi.mocked(http.post).mock.calls.length === 1,
      'the verification request',
    )
    fixture.destroy()

    fail(new Error('card declined'))
    await waitUntil(() => warn.mock.calls.length === 1, 'the failure log')
    expect(warn).toHaveBeenCalledWith('Verifying the payment failed after the page unmounted', {
      error: expect.objectContaining({ message: 'card declined' }),
      provider: 'stripe',
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('still reports the result under StrictMode', async () => {
    // Angular has no StrictMode: it constructs the function once, exactly the
    // single attempt React's double-invoked effect must survive.
    const http = createTestHttpClient()
    vi.mocked(http.post).mockResolvedValue(
      testHttpResponse({}, 'POST', '/users/user_1/verify-payment/stripe'),
    )
    const client = makeAuthClient()
    const onVerified = vi.fn()

    const { fixture, result } = mountVerify({ onVerified }, client, http)

    await waitFor(fixture, () => result.status() === 'verified', 'verified')
    expect(onVerified).toHaveBeenCalledTimes(1)
    expect(vi.mocked(http.post)).toHaveBeenCalledTimes(1)
  })
})
