// @vitest-environment jsdom
/**
 * `useVerifyPaymentReturn`: React's `useVerifyPaymentReturn.test.tsx` cases in
 * Svelte's idiom.
 *
 * A Svelte hook runs once, during component init, and publishes through
 * stores; this file stubs the `svelte` context and lifecycle the same way the
 * package's `hooks.test.ts` does, so `renderHook`/`unmount` read like React's
 * and the verification state is read with `get()`.
 *
 * HTTP goes through the package's REAL fetch client over a stubbed `fetch`, so
 * a request assertion is made on the transport (URL, method, body,
 * credentials) — the same wire facts React asserts on its client mock.
 *
 * @module
 */

import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import { createFetchClient, type HttpClient } from '@molecule/app-http'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import {
  getProvider as getLoggerProvider,
  setProvider as setLoggerProvider,
} from '@molecule/app-logger'

import { setMoleculeContext } from '../../context.js'
import type { MoleculeConfig } from '../../types.js'
import { useVerifyPaymentReturn } from '../useVerifyPaymentReturn.js'

// --- Mock svelte's component context and lifecycle ---
const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

type User = { id: string; email: string }

/** The signed-in user every fixture reports unless told otherwise. */
const SIGNED_IN: User = { id: 'user_1', email: 'buyer@example.com' }

/**
 * Runs `run` once, the way a component's init does, under `config`'s services.
 *
 * @param config - The services to register through `setMoleculeContext`.
 * @param run - Calls the hook under test; its return value is kept.
 * @returns The hook's result, plus the teardown that runs its destroy callbacks.
 */
function renderHook<T>(config: MoleculeConfig, run: () => T): { result: T; unmount: () => void } {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext(config)
  const result = run()
  return {
    result,
    unmount: () => {
      for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
    },
  }
}

/**
 * A JSON response for the stubbed transport.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
function jsonResponse(body: unknown = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Points the jsdom address bar at a checkout-return URL.
 *
 * @param search - The query string to set (including `?`).
 */
function setSearch(search: string): void {
  window.history.replaceState({}, '', `/plan-updated${search}`)
}

/** The stubbed transport every case installs. */
let fetchMock: Mock<typeof fetch>

/**
 * A minimal auth client exposing the pieces `useAuth` reads, with a way for the
 * test to announce an auth change.
 *
 * @param options - Whether auth has hydrated, and the signed-in user.
 * @returns The stub client, its `refresh` spy and its notifier.
 */
function makeAuthClient(options: { initialized?: boolean; user?: User | null } = {}): {
  client: AuthClient<User>
  refresh: Mock<AuthClient<User>['refresh']>
  notify: () => void
} {
  const { initialized = true, user = SIGNED_IN } = options
  const state: AuthState<User> = {
    status: initialized ? (user ? 'authenticated' : 'unauthenticated') : 'loading',
    initialized,
    authenticated: !!user,
    user: user ?? null,
    loading: false,
    error: null,
  }
  const listeners = new Set<(next: AuthState<User>) => void>()
  const notify = (): void => {
    for (const listener of [...listeners]) listener(state)
  }
  const refresh = vi.fn<AuthClient<User>['refresh']>()
  refresh.mockResolvedValue({ user: SIGNED_IN, accessToken: 'token' })

  const client: AuthClient<User> = {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    setUser: () => {},
    getAccessToken: () => (state.user ? 'token' : null),
    setAccessToken: () => {},
    setSession: () => {},
    getRefreshToken: () => null,
    login: async () => ({ user: SIGNED_IN }),
    logout: async () => {},
    register: async () => ({ user: SIGNED_IN }),
    refresh,
    requestPasswordReset: async () => {},
    confirmPasswordReset: async () => {},
    updateProfile: async () => SIGNED_IN,
    changePassword: async () => {},
    initialize: async () => {},
    subscribe: (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    onAuthChange: (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    addEventListener: () => () => {},
    destroy: () => {
      listeners.clear()
    },
  }
  return { client, refresh, notify }
}

/**
 * A real fetch client over the stubbed transport: typed against `HttpClient`,
 * so no request-layer mock casts are needed.
 *
 * @returns The client.
 */
function makeHttpClient(): HttpClient {
  return createFetchClient({ baseURL: '' })
}

/**
 * The wire facts of one request the hook made.
 *
 * @param index - Which request to read.
 * @returns Its URL and body.
 */
function requestAt(index = 0): { url: string; body: string } {
  const [url, init] = fetchMock.mock.calls[index]
  return {
    url: String(url),
    body: typeof init?.body === 'string' ? init.body : '',
  }
}

/**
 * A `Logger` whose `warn` records what it is called with.
 *
 * @param warn - The recording `warn` implementation.
 * @returns The logger.
 */
function createLogger(warn: Logger['warn']): Logger {
  const logger: Logger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn,
    error: () => {},
    setLevel: () => {},
    getLevel: () => 'info',
    child: () => logger,
    withContext: () => logger,
    addTransport: () => () => {},
    removeTransport: () => {},
  }
  return logger
}

/**
 * A logger provider whose logger records `warn`.
 *
 * @param warn - The recording `warn` implementation.
 * @returns The provider.
 */
function createLoggerProvider(warn: Logger['warn']): LoggerProvider {
  const logger = createLogger(warn)
  return {
    getLogger: () => logger,
    createLogger: () => logger,
    setLevel: () => {},
    getLevel: () => 'info',
    addTransport: () => () => {},
    enable: () => {},
    disable: () => {},
    isEnabled: () => true,
  }
}

/** Lets every settled promise chain run. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('useVerifyPaymentReturn', () => {
  let previousLoggerProvider: LoggerProvider

  beforeEach(() => {
    setSearch('')
    fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)
    previousLoggerProvider = getLoggerProvider()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setLoggerProvider(previousLoggerProvider)
    window.history.replaceState({}, '', '/')
  })

  it('verifies the purchase named by the return URL, from the app origin', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_123')
    const { client, refresh } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(requestAt()).toEqual({
      url: '/users/user_1/verify-payment/stripe',
      body: JSON.stringify({ subscriptionId: 'cs_live_123' }),
    })
    // The request is a same-origin call from the app page, so the session cookie applies.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ credentials: 'same-origin', method: 'POST' }),
    )
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
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(requestAt()).toEqual({
      url: `/users/user_1/verify-payment/${provider}`,
      body: JSON.stringify({ subscriptionId: id }),
    })
  })

  it('stays verified and logs when the profile refresh after payment fails', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const warn = vi.fn<Logger['warn']>()
    setLoggerProvider(createLoggerProvider(warn))
    const { client, refresh } = makeAuthClient()
    refresh.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(warn).toHaveBeenCalledWith('Refreshing the profile after payment failed', {
      error: expect.objectContaining({ message: 'network down' }),
    })
  })

  it('stays idle and issues no request on a normal page visit', async () => {
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    expect(get(result.status)).toBe('idle')
    expect(get(result.isReturn)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // After the redirect the page is a cold load: the bearer token is gone and
  // the session is still being restored from the httpOnly cookie. Verifying
  // before that lands would send the request unauthenticated.
  it('waits for auth to hydrate before verifying', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const { client } = makeAuthClient({ initialized: false, user: null })

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    expect(get(result.status)).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failure and can retry it', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_fail')
    fetchMock.mockRejectedValueOnce(new Error('502')).mockResolvedValue(jsonResponse())
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('failed'))
    expect(get(result.error)?.message).toBe('502')

    result.retry()

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('verifies once per transaction even as auth state settles', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_once')
    const { client, notify } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    // Each auth change re-reads the URL and the gate, as React's re-render does.
    notify()
    notify()
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  // A reload (or a shared link) must not re-run a purchase verification.
  it('drops the provider parameters from the URL once verified', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_clean&utm_source=email')
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn(),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(window.location.search).toBe('?utm_source=email')
  })

  it('keeps the URL intact when cleanUrl is disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_keep')
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn({ cleanUrl: false }),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(window.location.search).toBe('?provider=stripe&sessionId=cs_live_keep')
  })

  it('uses the provider option when the URL names none', async () => {
    setSearch('?sessionId=cs_live_opt')
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn({ provider: 'stripe' }),
    )

    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(requestAt()).toEqual({
      url: '/users/user_1/verify-payment/stripe',
      body: JSON.stringify({ subscriptionId: 'cs_live_opt' }),
    })
  })

  it('does nothing when disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_off')
    const { client } = makeAuthClient()

    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn({ enabled: false }),
    )

    expect(get(result.status)).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('useVerifyPaymentReturn after unmount', () => {
  let previousLoggerProvider: LoggerProvider

  beforeEach(() => {
    setSearch('?provider=stripe&sessionId=cs_live_9')
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    previousLoggerProvider = getLoggerProvider()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setLoggerProvider(previousLoggerProvider)
    window.history.replaceState({}, '', '/')
  })

  it('refreshes the profile, but calls no callback and leaves the next page URL alone', async () => {
    let answer: (response: Response) => void = () => {}
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve
        }),
    )
    const { client, refresh } = makeAuthClient()
    const onVerified = vi.fn<() => void>()
    const { unmount } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn({ onVerified }),
    )
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    unmount()
    // The buyer has moved on to another page by the time the request settles.
    window.history.replaceState({ page: 'next' }, '', '/next?tab=2&provider=stripe&sessionId=x')

    answer(jsonResponse())
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    await flush()

    expect(onVerified).not.toHaveBeenCalled()
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/next?tab=2&provider=stripe&sessionId=x',
    )
    expect(window.history.state).toEqual({ page: 'next' })
  })

  it('logs a failure that settles after unmount instead of calling onError', async () => {
    const warn = vi.fn<Logger['warn']>()
    setLoggerProvider(createLoggerProvider(warn))
    let fail: (error: Error) => void = () => {}
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    const { client } = makeAuthClient()
    const onError = vi.fn<(error: Error) => void>()
    const { unmount } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn({ onError }),
    )
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    unmount()

    fail(new Error('card declined'))
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Verifying the payment failed after the page unmounted', {
        error: expect.objectContaining({ message: 'card declined' }),
        provider: 'stripe',
      }),
    )
    expect(onError).not.toHaveBeenCalled()
  })

  it('still reports the result under StrictMode', async () => {
    fetchMock.mockResolvedValue(jsonResponse())
    const { client } = makeAuthClient()
    const onVerified = vi.fn<() => void>()
    const { result } = renderHook({ auth: client, http: makeHttpClient() }, () =>
      useVerifyPaymentReturn({ onVerified }),
    )

    // Svelte has no StrictMode; what a caller observes there — one result
    // reported once, from one request — is what this asserts.
    await vi.waitFor(() => expect(get(result.status)).toBe('verified'))
    expect(onVerified).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
