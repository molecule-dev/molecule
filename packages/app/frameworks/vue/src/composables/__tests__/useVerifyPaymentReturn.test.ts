// @vitest-environment jsdom

/**
 * The post-checkout return composable, pinned to the contract React's
 * `useVerifyPaymentReturn` guarantees: it verifies what the return URL names,
 * waits for auth to hydrate, runs at most once per transaction, cleans the
 * address bar, and reports nothing after unmount.
 *
 * The React cases render under `AuthContext`/`HttpContext`; a Vue composable is
 * injected through `moleculePlugin`, and its HTTP client is a real
 * `createFetchClient()` whose `fetch` the test answers, so "the hook posted
 * this" is the same observable fact here as a `post` spy is there.
 *
 * @module
 */

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type Mock, type Mocked, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import { createFetchClient, type HttpClient } from '@molecule/app-http'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import { setProvider as setLoggerProvider } from '@molecule/app-logger'

import { moleculePlugin } from '../../plugin.js'
import {
  useVerifyPaymentReturn,
  type UseVerifyPaymentReturnOptions,
  type UseVerifyPaymentReturnResult,
} from '../useVerifyPaymentReturn.js'

type User = { id: string; email: string }

const wrappers: VueWrapper[] = []

/**
 * Bonds a logger provider whose named logger forwards to one `warn` spy, so a
 * logged failure is asserted on instead of printed.
 *
 * @returns The `warn` spy the composable must call.
 */
function installWarnLogger(): Mock<Logger['warn']> {
  const warn = vi.fn<Logger['warn']>()
  const logger: Logger = {
    trace: vi.fn<Logger['trace']>(),
    debug: vi.fn<Logger['debug']>(),
    info: vi.fn<Logger['info']>(),
    warn,
    error: vi.fn<Logger['error']>(),
    setLevel: vi.fn<Logger['setLevel']>(),
    getLevel: vi.fn<Logger['getLevel']>(() => 'silent'),
    child: vi.fn<Logger['child']>(() => logger),
    withContext: vi.fn<Logger['withContext']>(() => logger),
    addTransport: vi.fn<Logger['addTransport']>(() => () => {}),
    removeTransport: vi.fn<Logger['removeTransport']>(),
  }
  const provider: LoggerProvider = {
    getLogger: vi.fn<LoggerProvider['getLogger']>(() => logger),
    createLogger: vi.fn<LoggerProvider['createLogger']>(() => logger),
    setLevel: vi.fn<LoggerProvider['setLevel']>(),
    getLevel: vi.fn<LoggerProvider['getLevel']>(() => 'silent'),
    addTransport: vi.fn<LoggerProvider['addTransport']>(() => () => {}),
    enable: vi.fn<LoggerProvider['enable']>(),
    disable: vi.fn<LoggerProvider['disable']>(),
    isEnabled: vi.fn<LoggerProvider['isEnabled']>(() => true),
  }
  setLoggerProvider(provider)
  return warn
}

/**
 * Creates the auth-client surface `useAuth` reads, with a refresh spy and the
 * subscriber list a test notifies to settle auth.
 *
 * @param options - Whether auth has hydrated, and the signed-in user.
 * @returns The stub client, its `refresh` spy, and a `notify` that delivers the
 *   current state to every subscriber (like the real client on a state change).
 */
function makeAuthClient(options: { initialized?: boolean; user?: User | null } = {}): {
  client: Mocked<AuthClient<User>>
  refresh: Mock<AuthClient<User>['refresh']>
  notify: () => void
} {
  const { initialized = true, user = { id: 'user_1', email: 'buyer@example.com' } } = options
  const fallbackUser: User = { id: 'user_1', email: 'buyer@example.com' }
  let state: AuthState<User> = {
    status: initialized ? (user ? 'authenticated' : 'unauthenticated') : 'loading',
    initialized,
    authenticated: !!user,
    user: user ?? null,
    loading: false,
    error: null,
  }
  const listeners = new Set<(next: AuthState<User>) => void>()
  const refresh = vi
    .fn<AuthClient<User>['refresh']>()
    .mockResolvedValue({ user: state.user ?? fallbackUser, accessToken: 'token' })

  const client: Mocked<AuthClient<User>> = {
    getState: vi.fn<AuthClient<User>['getState']>(() => state),
    isAuthenticated: vi.fn<AuthClient<User>['isAuthenticated']>(() => state.authenticated),
    getUser: vi.fn<AuthClient<User>['getUser']>(() => state.user),
    setUser: vi.fn<AuthClient<User>['setUser']>(),
    getAccessToken: vi.fn<AuthClient<User>['getAccessToken']>(() => 'token'),
    setAccessToken: vi.fn<AuthClient<User>['setAccessToken']>(),
    setSession: vi.fn<AuthClient<User>['setSession']>(),
    getRefreshToken: vi.fn<AuthClient<User>['getRefreshToken']>(() => null),
    getToken: vi.fn<() => string | null>(() => 'token'),
    login: vi
      .fn<AuthClient<User>['login']>()
      .mockResolvedValue({ user: fallbackUser, accessToken: 'token' }),
    logout: vi.fn<AuthClient<User>['logout']>().mockResolvedValue(undefined),
    register: vi
      .fn<AuthClient<User>['register']>()
      .mockResolvedValue({ user: fallbackUser, accessToken: 'token' }),
    refresh,
    requestPasswordReset: vi
      .fn<AuthClient<User>['requestPasswordReset']>()
      .mockResolvedValue(undefined),
    confirmPasswordReset: vi
      .fn<AuthClient<User>['confirmPasswordReset']>()
      .mockResolvedValue(undefined),
    updateProfile: vi
      .fn<AuthClient<User>['updateProfile']>()
      .mockImplementation(async (data) => ({ ...fallbackUser, ...data })),
    changePassword: vi.fn<AuthClient<User>['changePassword']>().mockResolvedValue(undefined),
    initialize: vi.fn<AuthClient<User>['initialize']>().mockResolvedValue(undefined),
    subscribe: vi.fn<AuthClient<User>['subscribe']>(() => () => {}),
    onAuthChange: vi.fn<AuthClient<User>['onAuthChange']>((listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }),
    addEventListener: vi.fn<AuthClient<User>['addEventListener']>(() => () => {}),
    destroy: vi.fn<AuthClient<User>['destroy']>(),
  }

  const notify = (): void => {
    state = { ...state }
    listeners.forEach((listener) => listener(state))
  }

  return { client, refresh, notify }
}

/**
 * A successful empty verify-payment response.
 *
 * @returns The `Response` the fetch client parses.
 */
function okResponse(): Response {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Answers `fetch` with one handler and stubs it globally.
 *
 * @param impl - The fetch implementation.
 * @returns The fetch spy.
 */
function installFetch(impl: typeof fetch): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * Every POST `fetch` received — the composable's verification request.
 *
 * @param fetchMock - The fetch spy.
 * @returns The POST calls.
 */
function postCalls(fetchMock: Mock<typeof fetch>): Mock<typeof fetch>['mock']['calls'] {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
}

/**
 * Mounts the composable inside a component under the plugin's auth + http
 * providers — the Vue counterpart of React's `renderHook` + contexts.
 *
 * @param auth - The auth client to inject.
 * @param http - The http client to inject.
 * @param options - Options passed to the composable.
 * @returns The composable result and the mounted wrapper.
 */
function runVerification(
  auth: Mocked<AuthClient<User>>,
  http: HttpClient,
  options: UseVerifyPaymentReturnOptions = {},
): { result: UseVerifyPaymentReturnResult; wrapper: VueWrapper } {
  let captured: UseVerifyPaymentReturnResult | null = null
  const Probe = defineComponent({
    setup() {
      captured = useVerifyPaymentReturn(options)
      return () => h('div')
    },
  })
  const wrapper = mount(Probe, { global: { plugins: [[moleculePlugin, { auth, http }]] } })
  wrappers.push(wrapper)
  if (!captured) throw new Error('useVerifyPaymentReturn setup did not run')
  return { result: captured, wrapper }
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
 * The fetch client under test — retries off, so one verification is one call.
 *
 * @returns The client.
 */
function makeHttpClient(): HttpClient {
  return createFetchClient({ retry: false })
}

let warn: Mock<Logger['warn']>

beforeEach(() => {
  warn = installWarnLogger()
  setSearch('')
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
  setSearch('')
})

describe('useVerifyPaymentReturn', () => {
  it('verifies the purchase named by the return URL, from the app origin', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_123')
    const fetchMock = installFetch(async () => okResponse())
    const { client, refresh } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient())

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    const calls = postCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(String(calls[0][0])).toBe('/users/user_1/verify-payment/stripe')
    const body: unknown = JSON.parse(String(calls[0][1]?.body))
    expect(body).toEqual({ subscriptionId: 'cs_live_123' })
    // The cached profile still says "free" until it is re-read.
    expect(refresh).toHaveBeenCalled()
  })

  // PayPal appends its own parameter names to the return URL.
  const providerIds: Array<[string, string, string]> = [
    ['?provider=paypal&subscription_id=I-ABC', 'paypal', 'I-ABC'],
    ['?provider=paypal&token=EC-9GH', 'paypal', 'EC-9GH'],
    ['?provider=stripe&session_id=cs_live_456', 'stripe', 'cs_live_456'],
  ]
  it.each(providerIds)('reads the provider id from %s', async (search, provider, id) => {
    setSearch(search)
    const fetchMock = installFetch(async () => okResponse())
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient())

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    const calls = postCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(String(calls[0][0])).toBe(`/users/user_1/verify-payment/${provider}`)
    const body: unknown = JSON.parse(String(calls[0][1]?.body))
    expect(body).toEqual({ subscriptionId: id })
  })

  it('stays verified and logs when the profile refresh after payment fails', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    installFetch(async () => okResponse())
    const { client, refresh } = makeAuthClient()
    refresh.mockRejectedValueOnce(new Error('network down'))

    const { result } = runVerification(client, makeHttpClient())

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    expect(warn).toHaveBeenCalledWith('Refreshing the profile after payment failed', {
      error: expect.objectContaining({ message: 'network down' }),
    })
  })

  it('stays idle and issues no request on a normal page visit', async () => {
    const fetchMock = installFetch(async () => okResponse())
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient())

    expect(result.status.value).toBe('idle')
    expect(result.isReturn.value).toBe(false)
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  // After the redirect the page is a cold load: the bearer token is gone and
  // the session is still being restored from the httpOnly cookie. Verifying
  // before that lands would send the request unauthenticated.
  it('waits for auth to hydrate before verifying', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const fetchMock = installFetch(async () => okResponse())
    const { client } = makeAuthClient({ initialized: false, user: null })

    const { result } = runVerification(client, makeHttpClient())

    expect(result.status.value).toBe('idle')
    expect(postCalls(fetchMock)).toHaveLength(0)
  })

  it('reports a failure and can retry it', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_fail')
    const fetchMock = installFetch(async () => {
      if (fetchMock.mock.calls.length === 1) throw new Error('502')
      return okResponse()
    })
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient())

    await vi.waitFor(() => expect(result.status.value).toBe('failed'))
    expect(result.error.value?.message).toBe('502')

    result.retry()

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    expect(postCalls(fetchMock)).toHaveLength(2)
  })

  it('verifies once per transaction even as auth state settles', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_once')
    const fetchMock = installFetch(async () => okResponse())
    const { client, notify } = makeAuthClient()

    const { result, wrapper } = runVerification(client, makeHttpClient())

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    // Auth settles: a fresh state object, the same session — twice — and the
    // component re-renders, the way React's rerender re-runs the hook body.
    notify()
    notify()
    await flushPromises()
    wrapper.vm.$forceUpdate()
    await flushPromises()

    expect(postCalls(fetchMock)).toHaveLength(1)
  })

  // A reload (or a shared link) must not re-run a purchase verification.
  it('drops the provider parameters from the URL once verified', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_clean&utm_source=email')
    installFetch(async () => okResponse())
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient())

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    expect(window.location.search).toBe('?utm_source=email')
  })

  it('keeps the URL intact when cleanUrl is disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_keep')
    installFetch(async () => okResponse())
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient(), { cleanUrl: false })

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    expect(window.location.search).toBe('?provider=stripe&sessionId=cs_live_keep')
  })

  it('uses the provider option when the URL names none', async () => {
    setSearch('?sessionId=cs_live_opt')
    const fetchMock = installFetch(async () => okResponse())
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient(), { provider: 'stripe' })

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    const calls = postCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(String(calls[0][0])).toBe('/users/user_1/verify-payment/stripe')
    const body: unknown = JSON.parse(String(calls[0][1]?.body))
    expect(body).toEqual({ subscriptionId: 'cs_live_opt' })
  })

  it('does nothing when disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_off')
    const fetchMock = installFetch(async () => okResponse())
    const { client } = makeAuthClient()

    const { result } = runVerification(client, makeHttpClient(), { enabled: false })

    expect(result.status.value).toBe('idle')
    expect(postCalls(fetchMock)).toHaveLength(0)
  })
})

describe('useVerifyPaymentReturn after unmount', () => {
  beforeEach(() => {
    setSearch('?provider=stripe&sessionId=cs_live_9')
  })

  it('refreshes the profile, but calls no callback and leaves the next page URL alone', async () => {
    let answer: (value: Response) => void = () => {}
    const fetchMock = installFetch(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve
        }),
    )
    const { client, refresh } = makeAuthClient()
    const onVerified = vi.fn<() => void>()
    const { wrapper } = runVerification(client, makeHttpClient(), { onVerified })
    await vi.waitFor(() => expect(postCalls(fetchMock)).toHaveLength(1))
    wrapper.unmount()
    // The buyer has moved on to another page by the time the request settles.
    window.history.replaceState({ page: 'next' }, '', '/next?tab=2&provider=stripe&sessionId=x')

    answer(okResponse())
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(onVerified).not.toHaveBeenCalled()
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/next?tab=2&provider=stripe&sessionId=x',
    )
    expect(window.history.state).toEqual({ page: 'next' })
  })

  it('logs a failure that settles after unmount instead of calling onError', async () => {
    let fail: (error: Error) => void = () => {}
    const fetchMock = installFetch(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    const { client } = makeAuthClient()
    const onError = vi.fn<(error: Error) => void>()
    const { wrapper } = runVerification(client, makeHttpClient(), { onError })
    await vi.waitFor(() => expect(postCalls(fetchMock)).toHaveLength(1))
    wrapper.unmount()

    fail(new Error('card declined'))
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Verifying the payment failed after the page unmounted', {
        error: expect.objectContaining({ message: 'card declined' }),
        provider: 'stripe',
      }),
    )
    expect(onError).not.toHaveBeenCalled()
  })

  // React's StrictMode double-invokes mount effects; Vue has no such second
  // mount. What a caller of the API observes under it is the contract ported
  // here: one verification, one `onVerified`, and a settled `verified` status.
  it('still reports the result under StrictMode', async () => {
    const fetchMock = installFetch(async () => okResponse())
    const { client } = makeAuthClient()
    const onVerified = vi.fn<() => void>()
    const { result } = runVerification(client, makeHttpClient(), { onVerified })

    await vi.waitFor(() => expect(result.status.value).toBe('verified'))
    expect(onVerified).toHaveBeenCalledTimes(1)
    expect(postCalls(fetchMock)).toHaveLength(1)
  })
})
