// @vitest-environment jsdom
/**
 * The Solid counterparts of React's `useVerifyPaymentReturn.test.tsx`: the same
 * cases, under the same titles, asserting what a caller of the primitive
 * observes.
 *
 * Solid returns the state as accessors and has no rerender, so a React case is
 * translated to the fact it pins: the accessor read after a change is the
 * changed one, and an auth-state notification stands in for a rerender.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import { setProvider as setLoggerProvider } from '@molecule/app-logger'

import { AuthContext, HttpContext } from '../context.js'
import {
  useVerifyPaymentReturn,
  type UseVerifyPaymentReturnOptions,
  type UseVerifyPaymentReturnResult,
} from '../primitives/verify-payment-return.js'

/** The signed-in buyer the API returns. */
interface User {
  id: string
  email: string
}

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

/**
 * Wraps a `vi.fn` so a mock property carries its method's real signature
 * without a cast.
 *
 * @param mock - The recording mock.
 * @returns The same mock, typed as the interface method it stands in for.
 */
const asMethod = <Method extends (...args: never[]) => unknown>(
  mock: Mock<Method>,
): Mock<Method> & Method =>
  Object.assign(mock, (): never => {
    throw new Error('generic method stand-in — calls are recorded by the vi.fn mock')
  })

/** A typed `post` mock, the recording form of `HttpClient['post']`. */
type PostMock = Mock<HttpClient['post']> & HttpClient['post']

/**
 * Builds a typed `post` mock.
 *
 * @returns The mock, ready for `mockResolvedValue`/`mockRejectedValue`.
 */
function makePost(): PostMock {
  return asMethod(vi.fn<HttpClient['post']>())
}

/**
 * Builds an `HttpResponse<T>` fixture.
 *
 * @param data - The response body.
 * @returns The response.
 */
function httpResponse<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'POST', url: '/users/user_1/verify-payment/stripe' },
  }
}

/**
 * A logger provider whose warning is recorded.
 *
 * @param warn - The warning recorder.
 * @returns The typed provider.
 */
function loggerProvider(warn: (message: string, ...args: unknown[]) => void): LoggerProvider {
  const logger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn,
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: () => 'info',
    child: () => logger,
    withContext: () => logger,
    addTransport: vi.fn(() => () => {}),
    removeTransport: vi.fn(),
  }
  return {
    getLogger: () => logger,
    createLogger: () => logger,
    setLevel: vi.fn(),
    getLevel: () => 'info',
    addTransport: vi.fn(() => () => {}),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: () => true,
  }
}

/**
 * A typed auth client whose session state the test can publish.
 *
 * @param options - Whether auth has hydrated, and the signed-in user.
 * @returns The client, its `refresh` spy, and a publish function that notifies
 *   its listeners of a new state.
 */
function makeAuthClient(options: { initialized?: boolean; user?: User | null } = {}): {
  client: AuthClient<User>
  refresh: Mock<AuthClient<User>['refresh']>
  publish: (next?: Partial<AuthState<User>>) => void
} {
  const { initialized = true, user = { id: 'user_1', email: 'buyer@example.com' } } = options
  let state: AuthState<User> = {
    status: initialized ? (user ? 'authenticated' : 'unauthenticated') : 'loading',
    initialized,
    authenticated: !!user,
    user: user ?? null,
    loading: false,
    error: null,
  }
  const listeners = new Set<(next: AuthState<User>) => void>()
  const publish = (next: Partial<AuthState<User>> = {}): void => {
    state = { ...state, ...next }
    listeners.forEach((listener) => listener(state))
  }
  const profile: User = user ?? { id: 'user_1', email: 'buyer@example.com' }
  const refresh = vi
    .fn<AuthClient<User>['refresh']>()
    .mockResolvedValue({ user: profile, accessToken: 'token' })

  const client: AuthClient<User> = {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    setUser: vi.fn(),
    getAccessToken: () => (state.authenticated ? 'token' : null),
    setAccessToken: vi.fn(),
    setSession: vi.fn(),
    getRefreshToken: () => null,
    login: vi.fn(),
    logout: vi.fn(async () => {}),
    register: vi.fn(),
    refresh,
    requestPasswordReset: vi.fn(async () => {}),
    confirmPasswordReset: vi.fn(async () => {}),
    updateProfile: vi.fn(),
    changePassword: vi.fn(async () => {}),
    initialize: vi.fn(async () => {}),
    subscribe: () => () => {},
    onAuthChange: (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    addEventListener: vi.fn(() => () => {}),
    destroy: vi.fn(),
  }
  return { client, refresh, publish }
}

/**
 * Builds an `HttpClient` whose `post` is the test's stand-in.
 *
 * @param post - The `post` mock to install.
 * @returns The client.
 */
function makeHttpClient(post: PostMock): HttpClient {
  return {
    baseURL: '',
    defaultHeaders: {},
    get: asMethod(vi.fn<HttpClient['get']>()),
    post,
    put: asMethod(vi.fn<HttpClient['put']>()),
    patch: asMethod(vi.fn<HttpClient['patch']>()),
    delete: asMethod(vi.fn<HttpClient['delete']>()),
    request: asMethod(vi.fn<HttpClient['request']>()),
    setAuthToken: vi.fn(),
    getAuthToken: () => null,
    onAuthError: () => () => {},
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
  }
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
 * Mounts the primitive in the auth + http contexts it reads and captures its
 * result.
 *
 * @param client - The auth client to provide.
 * @param http - The http client to provide.
 * @param options - Provider fallback + lifecycle callbacks.
 * @returns The primitive's result and an idempotent unmount.
 */
function mountVerify(
  client: AuthClient<User>,
  http: HttpClient,
  options: UseVerifyPaymentReturnOptions = {},
): { result: UseVerifyPaymentReturnResult; unmount: () => void } {
  let captured: UseVerifyPaymentReturnResult | undefined
  function Probe(): JSX.Element {
    captured = useVerifyPaymentReturn(options)
    return <></>
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <AuthContext.Provider value={client}>
        <HttpContext.Provider value={http}>
          <Probe />
        </HttpContext.Provider>
      </AuthContext.Provider>
    ),
    container,
  )
  let unmounted = false
  const unmount = (): void => {
    if (unmounted) return
    unmounted = true
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  if (!captured) throw new Error('the probe did not create the primitive')
  return { result: captured, unmount }
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Retries an assertion until it passes or the deadline expires.
 *
 * @param assertion - The assertion to retry.
 * @param timeoutMs - How long to keep retrying.
 * @returns A promise resolved once the assertion passes.
 */
async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await settle()
    }
  }
}

describe('useVerifyPaymentReturn', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('verifies the purchase named by the return URL, from the app origin', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_123')
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client, refresh } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post))

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(post).toHaveBeenCalledWith('/users/user_1/verify-payment/stripe', {
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
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post))

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(post).toHaveBeenCalledWith(`/users/user_1/verify-payment/${provider}`, {
      subscriptionId: id,
    })
  })

  it('stays verified and logs when the profile refresh after payment fails', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const warn = vi.fn<(message: string, ...args: unknown[]) => void>()
    setLoggerProvider(loggerProvider(warn))
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client, refresh } = makeAuthClient()
    refresh.mockRejectedValueOnce(new Error('network down'))

    const { result } = mountVerify(client, makeHttpClient(post))

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(warn).toHaveBeenCalledWith('Refreshing the profile after payment failed', {
      error: expect.objectContaining({ message: 'network down' }),
    })
  })

  it('stays idle and issues no request on a normal page visit', async () => {
    const post = makePost()
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post))

    expect(result.status()).toBe('idle')
    expect(result.isReturn()).toBe(false)
    expect(post).not.toHaveBeenCalled()
  })

  // After the redirect the page is a cold load: the bearer token is gone and
  // the session is still being restored from the httpOnly cookie. Verifying
  // before that lands would send the request unauthenticated.
  it('waits for auth to hydrate before verifying', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const post = makePost()
    const { client } = makeAuthClient({ initialized: false, user: null })

    const { result } = mountVerify(client, makeHttpClient(post))

    expect(result.status()).toBe('idle')
    expect(post).not.toHaveBeenCalled()
  })

  it('reports a failure and can retry it', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_fail')
    const post = makePost()
    post.mockRejectedValueOnce(new Error('502'))
    post.mockResolvedValue(httpResponse({}))
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post))

    await waitFor(() => expect(result.status()).toBe('failed'))
    expect(result.error()?.message).toBe('502')

    result.retry()

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('verifies once per transaction even as auth state settles', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_once')
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client, publish } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post))

    await waitFor(() => expect(result.status()).toBe('verified'))
    // Solid's stand-in for React's rerender: the auth signal notifies again.
    publish()
    publish()
    await settle()

    expect(post).toHaveBeenCalledTimes(1)
  })

  // A reload (or a shared link) must not re-run a purchase verification.
  it('drops the provider parameters from the URL once verified', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_clean&utm_source=email')
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post))

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(window.location.search).toBe('?utm_source=email')
  })

  it('keeps the URL intact when cleanUrl is disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_keep')
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post), { cleanUrl: false })

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(window.location.search).toBe('?provider=stripe&sessionId=cs_live_keep')
  })

  it('uses the provider option when the URL names none', async () => {
    setSearch('?sessionId=cs_live_opt')
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post), { provider: 'stripe' })

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(post).toHaveBeenCalledWith('/users/user_1/verify-payment/stripe', {
      subscriptionId: 'cs_live_opt',
    })
  })

  it('does nothing when disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_off')
    const post = makePost()
    const { client } = makeAuthClient()

    const { result } = mountVerify(client, makeHttpClient(post), { enabled: false })

    expect(result.status()).toBe('idle')
    expect(post).not.toHaveBeenCalled()
  })
})

describe('useVerifyPaymentReturn after unmount', () => {
  beforeEach(() => {
    setSearch('?provider=stripe&sessionId=cs_live_9')
  })

  it('refreshes the profile, but calls no callback and leaves the next page URL alone', async () => {
    let answer: (value: HttpResponse<unknown>) => void = () => {}
    const post = makePost()
    post.mockImplementation(
      () =>
        new Promise<HttpResponse<unknown>>((resolve) => {
          answer = resolve
        }),
    )
    const { client, refresh } = makeAuthClient()
    const onVerified = vi.fn<() => void>()
    const { unmount } = mountVerify(client, makeHttpClient(post), { onVerified })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    unmount()
    // The buyer has moved on to another page by the time the request settles.
    window.history.replaceState({ page: 'next' }, '', '/next?tab=2&provider=stripe&sessionId=x')

    answer(httpResponse({}))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    await settle()

    expect(onVerified).not.toHaveBeenCalled()
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/next?tab=2&provider=stripe&sessionId=x',
    )
    expect(window.history.state).toEqual({ page: 'next' })
  })

  it('logs a failure that settles after unmount instead of calling onError', async () => {
    const warn = vi.fn<(message: string, ...args: unknown[]) => void>()
    setLoggerProvider(loggerProvider(warn))
    let fail: (error: Error) => void = () => {}
    const post = makePost()
    post.mockImplementation(
      () =>
        new Promise<HttpResponse<unknown>>((_resolve, reject) => {
          fail = reject
        }),
    )
    const { client } = makeAuthClient()
    const onError = vi.fn<(error: Error) => void>()
    const { unmount } = mountVerify(client, makeHttpClient(post), { onError })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    unmount()

    fail(new Error('card declined'))
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Verifying the payment failed after the page unmounted', {
        error: expect.objectContaining({ message: 'card declined' }),
        provider: 'stripe',
      }),
    )
    expect(onError).not.toHaveBeenCalled()
  })

  // Solid has no StrictMode: its mount effect runs once, so there is no double
  // invoke to survive. What React's case pins — the caller-observable result:
  // one verification and one callback — is asserted the same way.
  it('still reports the result under StrictMode', async () => {
    const post = makePost()
    post.mockResolvedValue(httpResponse({}))
    const { client } = makeAuthClient()
    const onVerified = vi.fn<() => void>()

    const { result } = mountVerify(client, makeHttpClient(post), { onVerified })

    await waitFor(() => expect(result.status()).toBe('verified'))
    expect(onVerified).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
  })
})
