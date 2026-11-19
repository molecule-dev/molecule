/**
 * The React-named hooks in Svelte's idiom, asserted against the same
 * behaviours as `packages/app/frameworks/react/src/__tests__/hooks.test.tsx`.
 *
 * A Svelte hook runs ONCE, during component init, and publishes through
 * stores; so where React's test rerenders, this one sets a store the hook
 * follows, and where React asserts a rendered value, this one reads the store.
 * The mounting surface is the same one the package's other tests use: the
 * `svelte` context and lifecycle functions are stubbed (there is no component
 * tree here), so `renderHook` below is React's `renderHook`, and `unmount` is
 * its `unmount`.
 *
 * HTTP goes through the package's REAL fetch client over a stubbed `fetch`,
 * so a request assertion is made on the transport (URL, method, headers,
 * body) — the same wire facts React asserts on its client mocks.
 *
 * @module
 */

import { onMount } from 'svelte'
import { derived, get, writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import { createFetchClient, type HttpClient } from '@molecule/app-http'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import { createMemoryRouter } from '@molecule/app-routing'
import type { StateListener, StateProvider, Store } from '@molecule/app-state'
import { createMemoryStorageProvider } from '@molecule/app-storage'
import { darkTheme, lightTheme, type Theme, type ThemeProvider } from '@molecule/app-theme'

import { setMoleculeContext, useStateProvider } from '../context.js'
import { useAuth } from '../hooks/useAuth.js'
import { useHttp, type UseHttpOptions } from '../hooks/useHttp.js'
import { useLogger } from '../hooks/useLogger.js'
import { useRouter } from '../hooks/useRouter.js'
import { useStorageValue } from '../hooks/useStorage.js'
import { useStore } from '../hooks/useStore.js'
import { useTheme } from '../hooks/useTheme.js'
import type { MoleculeConfig } from '../types.js'

// --- Mock svelte's component context and lifecycle ---
const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  mountCallbacks: [] as Array<() => void>,
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onMount: (callback: () => void): void => {
    svelteLifecycle.mountCallbacks.push(callback)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

/** Lets every microtask and the request's own continuation run. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Runs `run` once, the way a component's init does, under `config`'s services,
 * then runs the component's mount callbacks (React's committed effects).
 *
 * @param config - The services to register through `setMoleculeContext`.
 * @param run - Calls the hook under test; its return value is kept.
 * @returns The hook's result, plus the teardown that runs its destroy callbacks.
 */
function renderHook<T>(config: MoleculeConfig, run: () => T): { result: T; unmount: () => void } {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.mountCallbacks.length = 0
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext(config)
  const result = run()
  for (const callback of svelteLifecycle.mountCallbacks.splice(0)) callback()
  return {
    result,
    unmount: () => {
      for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
    },
  }
}

// --- Mock store ---
/**
 * Creates a mock store for testing.
 *
 * @param initial - The initial state value.
 * @returns A mock store instance.
 */
function createMockStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<StateListener<T>>()
  return {
    getState: () => state,
    setState: (partial) => {
      const previous = state
      const next = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...next }
      for (const listener of [...listeners]) listener(state, previous)
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy: () => {
      listeners.clear()
    },
  }
}

/**
 * Creates a mock state provider for testing.
 *
 * @returns A mock state provider instance.
 */
function createMockStateProvider(): StateProvider {
  return {
    createStore: <T>(config: { initialState: T }) => createMockStore(config.initialState),
  }
}

// --- Mock auth client ---
/** Options for {@link createMockAuthClient}. */
interface MockAuthOptions<T> {
  /** The user the client starts signed in as. */
  user?: T | null
  /** The user `login`/`register`/`refresh` sign in as. */
  signedIn?: T
  /** The status the client starts with (defaults from `user`). */
  status?: AuthState<T>['status']
}

/**
 * Creates a mock auth client for testing, plus the controls a test uses to
 * change its state — the client-side half of React's mock, typed against
 * `AuthClient` instead of cast to it.
 *
 * @param options - The starting user, the user a sign-in returns, and the status.
 * @returns The client and the state controls.
 */
function createMockAuthClient<T extends object>(
  options: MockAuthOptions<T> = {},
): {
  client: AuthClient<T>
  setStatus: (status: AuthState<T>['status']) => void
} {
  let user: T | null = options.user ?? null
  const listeners = new Set<(state: AuthState<T>) => void>()
  let snapshot: AuthState<T> = {
    status: options.status ?? (user === null ? 'unauthenticated' : 'authenticated'),
    initialized: true,
    authenticated: user !== null,
    user,
    loading: false,
    error: null,
  }

  const publish = (): void => {
    for (const listener of [...listeners]) listener(snapshot)
  }
  const setUser = (next: T | null): void => {
    user = next
    snapshot = {
      ...snapshot,
      user: next,
      authenticated: next !== null,
      status: next === null ? 'unauthenticated' : 'authenticated',
    }
    publish()
  }
  const signedIn = (): T => {
    if (options.signedIn === undefined) throw new Error('this mock signs in no user')
    return options.signedIn
  }

  const client: AuthClient<T> = {
    getState: () => snapshot,
    isAuthenticated: () => user !== null,
    getUser: () => user,
    setUser,
    getAccessToken: () => (user === null ? null : 'mock-access-token'),
    setAccessToken: () => {},
    setSession: (session) => setUser(session.user),
    getRefreshToken: () => (user === null ? null : 'mock-refresh-token'),
    login: async () => {
      const next = signedIn()
      setUser(next)
      return { user: next }
    },
    logout: async () => setUser(null),
    register: async () => ({ user: signedIn() }),
    refresh: async () => ({ user: signedIn() }),
    requestPasswordReset: async () => {},
    confirmPasswordReset: async () => {},
    updateProfile: async (data) => {
      if (user === null) throw new Error('not signed in')
      user = Object.assign(user, data)
      snapshot = { ...snapshot, user }
      publish()
      return user
    },
    changePassword: async () => {},
    initialize: async () => {},
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    onAuthChange: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    addEventListener: () => () => {},
    destroy: () => {
      listeners.clear()
    },
  }

  return {
    client,
    setStatus: (status) => {
      snapshot = { ...snapshot, status }
      publish()
    },
  }
}

// --- Mock theme provider ---
/**
 * Creates a mock theme provider for testing, starting on the light theme.
 *
 * @returns A mock theme provider instance.
 */
function createMockThemeProvider(): ThemeProvider {
  let current: Theme = lightTheme
  const listeners = new Set<(theme: Theme) => void>()
  const notify = (): void => {
    for (const listener of [...listeners]) listener(current)
  }
  return {
    getTheme: () => current,
    setTheme: (theme) => {
      current = typeof theme === 'string' ? (theme === 'dark' ? darkTheme : lightTheme) : theme
      notify()
    },
    toggleMode: () => {
      current = current.mode === 'light' ? darkTheme : lightTheme
      notify()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getThemes: () => [lightTheme, darkTheme],
  }
}

// --- Mock logger provider ---
/**
 * Creates a mock logger provider for testing.
 *
 * @returns The provider, its logger, and the logger's `info` spy.
 */
function createMockLoggerProvider(): {
  provider: LoggerProvider
  logger: Logger
  info: ReturnType<typeof vi.fn<Logger['info']>>
} {
  const info = vi.fn<Logger['info']>()
  const logger: Logger = {
    trace: () => {},
    debug: () => {},
    info,
    warn: () => {},
    error: () => {},
    setLevel: () => {},
    getLevel: () => 'info',
    child: () => logger,
    withContext: () => logger,
    addTransport: () => () => {},
    removeTransport: () => {},
  }
  return {
    provider: {
      getLogger: () => logger,
      createLogger: () => logger,
      setLevel: () => {},
      getLevel: () => 'info',
      addTransport: () => () => {},
      enable: () => {},
      disable: () => {},
      isEnabled: () => true,
    },
    logger,
    info,
  }
}

// --- The stubbed HTTP transport ---
/**
 * A real fetch client over the stubbed transport: typed against `HttpClient`,
 * so no request-layer mock casts are needed.
 *
 * @param defaultHeaders - Headers every request of this client carries.
 * @returns The client.
 */
function createTestHttpClient(defaultHeaders: Record<string, string> = {}): HttpClient {
  return createFetchClient({ baseURL: '', defaultHeaders })
}

/** One held GET request, released by the test. */
interface HeldAnswer {
  resolve: (response: Response) => void
  reject: (error: Error) => void
}

describe('useStore', () => {
  it('should return current state from store', () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    const { result } = renderHook({ state: stateProvider }, () => useStore(store))

    expect(get(result)).toEqual({ count: 0 })
  })

  it('should update when store state changes', async () => {
    const store = createMockStore({ count: 0 })
    const stateProvider = createMockStateProvider()

    const { result } = renderHook({ state: stateProvider }, () => useStore(store))

    expect(get(result).count).toBe(0)

    store.setState({ count: 5 })
    await flush()

    expect(get(result).count).toBe(5)
  })

  it('should support selector option', () => {
    const store = createMockStore({ count: 10, name: 'test' })
    const stateProvider = createMockStateProvider()

    const { result } = renderHook({ state: stateProvider }, () =>
      useStore(store, { selector: (state) => state.count * 2 }),
    )

    expect(get(result)).toBe(20)
  })
})

describe('useAuth', () => {
  it('should return auth state', () => {
    const auth = createMockAuthClient<{ id: string }>()

    const { result } = renderHook({ auth: auth.client }, () => useAuth<{ id: string }>())

    expect(get(result.isAuthenticated)).toBe(false)
    expect(get(result.user)).toBeNull()
  })

  it('should login and update state', async () => {
    const auth = createMockAuthClient<{ id: string; email: string }>({
      signedIn: { id: '1', email: 'test@example.com' },
    })

    const { result } = renderHook({ auth: auth.client }, () =>
      useAuth<{ id: string; email: string }>(),
    )

    await result.login({ email: 'test@example.com', password: 'password' })

    expect(get(result.isAuthenticated)).toBe(true)
    expect(get(result.user)?.email).toBe('test@example.com')
  })

  it('re-renders when only the status changes', () => {
    // A session check that reported 'unavailable' with the SAME user must still
    // publish: the snapshot a consumer reads includes `status`, and `status` is
    // also exposed at the top level because it is the one value a route guard
    // renders the session from.
    const auth = createMockAuthClient<{ id: string }>({ status: 'loading' })

    const { result } = renderHook({ auth: auth.client }, () => useAuth<{ id: string }>())
    expect(get(result.state).status).toBe('loading')
    expect(get(result.status)).toBe('loading')

    auth.setStatus('unavailable')

    expect(get(result.state).status).toBe('unavailable')
    expect(get(result.status)).toBe('unavailable')
  })
})

describe('useTheme', () => {
  it('should return current theme', () => {
    const themeProvider = createMockThemeProvider()

    const { result } = renderHook({ theme: themeProvider }, () => useTheme())

    expect(get(result.themeName)).toBe('light')
    expect(get(result.mode)).toBe('light')
  })

  it('should toggle theme via the provider toggleMode method', () => {
    const themeProvider = createMockThemeProvider()
    const toggleModeSpy = vi.spyOn(themeProvider, 'toggleMode')

    const { result } = renderHook({ theme: themeProvider }, () => useTheme())

    result.toggleTheme()

    // `toggleTheme` must delegate to the provider's purpose-built
    // `toggleMode()` rather than index-cycling `getThemes()`.
    expect(toggleModeSpy).toHaveBeenCalledOnce()
    expect(get(result.themeName)).toBe('dark')
  })

  it('falls back to cycling getThemes() when the provider has no toggleMode', () => {
    // A non-conforming provider that predates `toggleMode`: the method is gone
    // at runtime, which is exactly the provider this branch exists for.
    const legacyProvider = createMockThemeProvider()
    Reflect.deleteProperty(legacyProvider, 'toggleMode')

    const { result } = renderHook({ theme: legacyProvider }, () => useTheme())

    result.toggleTheme()

    expect(get(result.themeName)).toBe('dark')
  })

  // A static site prerenders on a server that reads no storage and no OS
  // preference, then hydrates in a browser that reads both. The hook must
  // render the server's theme while the markup it was sent is on screen — the
  // first read, during init — and switch to the live theme on mount, with no
  // provider event needed.
  it('hydrates with the server theme, then switches to the live one, without a mismatch', () => {
    const light = lightTheme
    const dark: Theme = { ...light, name: 'dark', mode: 'dark' }
    const clientProvider: ThemeProvider = {
      getTheme: () => dark,
      getServerTheme: () => light,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
    }
    const reads: string[] = []

    const { result } = renderHook({ theme: clientProvider }, () => {
      const theme = useTheme()
      // The component's init read is the one the server's markup was built
      // from; a mismatch here is the bug this pins.
      reads.push(get(theme.themeName))
      return theme
    })

    expect(reads[0]).toBe('light')
    // The mount switch is the hook's own re-read of the live theme.
    expect(get(result.themeName)).toBe('dark')
    expect(get(result.theme)).toBe(dark)
  })
})

describe('useRouter', () => {
  it('should return current location', () => {
    const router = createMemoryRouter({ initialEntries: ['/'] })

    const { result } = renderHook({ router }, () => useRouter())

    expect(get(result.location).pathname).toBe('/')
  })

  it('should navigate to new path', () => {
    const router = createMemoryRouter({ initialEntries: ['/'] })

    const { result } = renderHook({ router }, () => useRouter())

    result.navigate('/dashboard')

    expect(get(result.location).pathname).toBe('/dashboard')
  })
})

describe('useHttp', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>(async () => Response.json({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Answers `fetch` by hand, in any order. */
  function heldGets(): {
    pending: HeldAnswer[]
    answer: (index: number, data: unknown) => Promise<void>
    fail: (index: number, error: Error) => Promise<void>
  } {
    const pending: HeldAnswer[] = []
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          pending.push({ resolve, reject })
        }),
    )
    return {
      pending,
      answer: async (index, data) => {
        // The request reaches the transport after the gate's own await.
        await vi.waitFor(() => expect(pending.length).toBeGreaterThan(index))
        pending[index].resolve(Response.json(data))
        await flush()
      },
      fail: async (index, error) => {
        await vi.waitFor(() => expect(pending.length).toBeGreaterThan(index))
        pending[index].reject(error)
        await flush()
      },
    }
  }

  it('publishes committed options before a child layout effect calls the action', async () => {
    const httpClient = createTestHttpClient()
    const token = writable('first')
    const options = derived(token, (selection) => ({ headers: { 'X-Selection': selection } }))

    renderHook({ http: httpClient }, () => {
      const request = useHttp('GET', '/api/test', options)
      // The "child" that calls the action whenever the selection changes.
      token.subscribe(() => {
        void request.execute()
      })
      return request
    })
    await flush()
    fetchMock.mockClear()

    token.set('second')
    await flush()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ headers: { 'X-Selection': 'second' } }),
    )
  })

  it('keeps a committed action on committed options while a new render suspends', async () => {
    const httpClient = createTestHttpClient()
    const options = writable<UseHttpOptions<{ id: number }>>({
      headers: { 'X-Selection': 'committed' },
    })

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<{ id: number }>('GET', '/api/test', options),
    )
    // The action a committed tree hands down, before the options change.
    const execute = result.execute

    options.set({ headers: { 'X-Selection': 'pending' } })
    await flush()
    // In Svelte the hook is never re-invoked, so a changed option issues no
    // request of its own; the mounted action sends what it sees when called.
    expect(fetchMock).not.toHaveBeenCalled()

    const value = await execute()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ headers: { 'X-Selection': 'pending' } }),
    )
    expect(value).toEqual({ id: 1 })
  })

  it('keeps execute stable across ordinary rerenders', async () => {
    const httpClient = createTestHttpClient()

    const { result } = renderHook({ http: httpClient }, () => useHttp('GET', '/api/test'))
    const execute = result.execute

    await execute()

    expect(result.execute).toBe(execute)
  })

  it('keeps execute stable through its own state updates and inline options', async () => {
    const httpClient = createTestHttpClient()
    const nonce = writable(0)
    const options = derived(nonce, (value) => ({
      headers: { 'X-Nonce': String(value) },
      onSuccess: () => {},
    }))

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<{ id: number }>('GET', '/api/test', options),
    )
    const execute = result.execute

    // The hook's own loading → data updates rerender it.
    await result.execute()
    expect(get(result.data)).toEqual({ id: 1 })
    expect(result.execute).toBe(execute)

    // An ordinary parent change must not replace the action either.
    nonce.set(1)
    await flush()
    expect(result.execute).toBe(execute)
  })

  it('runs exactly one request from an effect that depends on execute', async () => {
    const httpClient = createTestHttpClient()
    const successes: string[] = []

    const { result } = renderHook({ http: httpClient }, () => {
      const request = useHttp<{ id: number }>('GET', '/api/test', {
        onSuccess: () => {
          successes.push('success')
        },
      })
      const attempts = { value: 0 }
      // Bounded fixture: an effect that re-fires because `execute` changed must
      // FAIL the call-count assertion, never spin the runner.
      onMount(() => {
        if (attempts.value >= 3) return
        attempts.value += 1
        void request.execute()
      })
      return request
    })

    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(successes).toEqual(['success'])
    expect(get(result.data)).toEqual({ id: 1 })
  })

  it('sends the current options and callback on a later manual call', async () => {
    const httpClient = createTestHttpClient()
    const firstSuccess = vi.fn<(data: { id: number }) => void>()
    const secondSuccess = vi.fn<(data: { id: number }) => void>()
    const source = writable<{ version: string; onSuccess: (data: { id: number }) => void }>({
      version: 'one',
      onSuccess: firstSuccess,
    })
    const options = derived(source, ({ version, onSuccess }) => ({
      headers: { 'X-Version': version },
      data: { name: 'widget' },
      onSuccess,
    }))

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<{ id: number }>('POST', '/api/items', options),
    )

    const execute = result.execute

    source.set({ version: 'two', onSuccess: secondSuccess })
    // Options do not churn the action; the call below still sends the latest ones.
    expect(result.execute).toBe(execute)

    await result.execute()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'widget' }),
        headers: { 'X-Version': 'two', 'Content-Type': 'application/json' },
      }),
    )
    expect(firstSuccess).not.toHaveBeenCalled()
    expect(secondSuccess).toHaveBeenCalledWith({ id: 1 })
  })

  it('selects the new URL, method and client when they change', async () => {
    const firstClient = createTestHttpClient()
    const secondClient = createTestHttpClient({ 'X-Client': 'second' })
    const method = writable<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET')
    const url = writable('/api/one')

    const first = renderHook({ http: firstClient }, () => useHttp<{ id: number }>(method, url))

    await first.result.execute()
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/one',
      expect.objectContaining({ method: 'GET' }),
    )

    // A replaced provider arrives as a fresh mount; method/url are stores the
    // mounted hook retargets the next call from.
    const second = renderHook({ http: secondClient }, () => useHttp<{ id: number }>(method, url))
    method.set('DELETE')
    url.set('/api/two')

    await second.result.execute()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/two',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-Client': 'second' }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(([input, init]) => [String(input), init?.method])).toEqual([
      ['/api/one', 'GET'],
      ['/api/two', 'DELETE'],
    ])
  })

  it('reports a failure through state and onError', async () => {
    const httpClient = createTestHttpClient()
    fetchMock.mockRejectedValueOnce(new Error('nope'))
    const onError = vi.fn<(error: Error) => void>()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp('GET', '/api/test', { onError }),
    )

    await result.execute()

    expect(get(result.data)).toBeNull()
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)?.message).toBe('nope')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('does not deliver a response to an unmounted hook', async () => {
    const httpClient = createTestHttpClient()
    const onSuccess = vi.fn<(data: { id: number }) => void>()
    const held = heldGets()

    const { result, unmount } = renderHook({ http: httpClient }, () =>
      useHttp<{ id: number }>('GET', '/api/test', { onSuccess }),
    )

    const pending = result.execute()
    unmount()

    await held.answer(0, { id: 7 })
    const value = await pending
    expect(value).toEqual({ id: 7 })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets state without replacing execute', async () => {
    const httpClient = createTestHttpClient()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<{ id: number }>('GET', '/api/test'),
    )
    const execute = result.execute

    await result.execute()
    expect(get(result.data)).toEqual({ id: 1 })

    result.reset()

    expect(get(result.data)).toBeNull()
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)).toBeNull()
    expect(result.execute).toBe(execute)
  })

  it('stays finite when StrictMode runs the consumer effect twice', async () => {
    const httpClient = createTestHttpClient()

    renderHook({ http: httpClient }, () => {
      const request = useHttp<{ id: number }>('GET', '/api/test')
      const attempts = { value: 0 }
      // A mount effect whose dependency chain would re-run it: a THIRD run
      // means execute was replaced. The cap keeps that regression a failed
      // assertion, not a spin.
      onMount(() => {
        if (attempts.value >= 3) return
        attempts.value += 1
        void request.execute()
      })
      return request
    })

    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1))
    await flush()

    // One mount effect (React's StrictMode runs two), never a chain of them.
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('should make GET request', async () => {
    const httpClient = createTestHttpClient()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<{ id: number }>('GET', '/api/test'),
    )

    expect(get(result.loading)).toBe(false)
    expect(get(result.data)).toBeNull()

    await result.execute()

    expect(get(result.data)).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'GET' }))
  })

  it('shows the newest request when an older one answers after it', async () => {
    const httpClient = createTestHttpClient()
    const seen: unknown[] = []
    const held = heldGets()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<string>('GET', '/api/tags', { onSuccess: (data) => seen.push(data) }),
    )

    void result.execute()
    void result.execute()

    await held.answer(1, 'newer')
    expect(get(result.data)).toBe('newer')
    expect(get(result.loading)).toBe(false)

    // The first load answers late: it must not replace what the newer one showed.
    await held.answer(0, 'older')
    expect(get(result.data)).toBe('newer')
    // Each request still reports its own outcome to its callback.
    expect(seen).toEqual(['newer', 'older'])
  })

  it('keeps loading while a newer request is in flight after an older one answers', async () => {
    const httpClient = createTestHttpClient()
    const held = heldGets()

    const { result } = renderHook({ http: httpClient }, () => useHttp<string>('GET', '/api/tags'))

    void result.execute()
    void result.execute()

    await held.answer(0, 'older')
    expect(get(result.loading)).toBe(true)
    expect(get(result.data)).toBeNull()

    await held.fail(1, new Error('offline'))
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)?.message).toBe('offline')
  })

  it('does not let a request answered after reset repopulate the state', async () => {
    const httpClient = createTestHttpClient()
    const held = heldGets()

    const { result } = renderHook({ http: httpClient }, () => useHttp<string>('GET', '/api/tags'))

    void result.execute()
    result.reset()
    await held.answer(0, 'late')

    expect({
      data: get(result.data),
      loading: get(result.loading),
      error: get(result.error),
    }).toEqual({ data: null, loading: false, error: null })
  })

  it('still shows a single request answered in order', async () => {
    const httpClient = createTestHttpClient()
    const held = heldGets()

    const { result } = renderHook({ http: httpClient }, () => useHttp<string>('GET', '/api/tags'))

    void result.execute()
    expect(get(result.loading)).toBe(true)

    await held.answer(0, 'only')

    expect(get(result.data)).toBe('only')
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)).toBeNull()
  })

  it('returns each request outcome while only the newest request owns state', async () => {
    const httpClient = createTestHttpClient()
    const onError = vi.fn<(error: Error) => void>()
    const held = heldGets()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<string>('GET', '/api/tags', { onError }),
    )

    const older = result.execute()
    const newer = result.execute()

    await held.answer(1, 'newer')
    await expect(newer).resolves.toBe('newer')

    await held.fail(0, new Error('older request failed'))
    await expect(older).resolves.toBeNull()
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: 'older request failed' }),
    )
    expect(get(result.data)).toBe('newer')
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)).toBeNull()

    const superseded = result.execute()
    const latest = result.execute()

    await held.answer(3, 'latest')
    await held.answer(2, 'superseded')
    await expect(superseded).resolves.toBe('superseded')
    await expect(latest).resolves.toBe('latest')
    expect(get(result.data)).toBe('latest')
  })

  it('keeps each submit callback even when a newer submit owns state', async () => {
    const httpClient = createTestHttpClient()
    const held = heldGets()
    const navigate = vi.fn<(data: string) => void>()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<string>('POST', '/api/items', { onSuccess: navigate }),
    )

    void result.execute()
    void result.execute()

    await held.answer(1, 'second receipt')
    await held.answer(0, 'first receipt')

    expect(navigate.mock.calls).toEqual([['second receipt'], ['first receipt']])
    expect(get(result.data)).toBe('second receipt')
  })

  it.each(['success', 'failure'] as const)(
    'reset supersedes a late %s without cancelling its callback or return value',
    async (outcome) => {
      const httpClient = createTestHttpClient()
      const onSuccess = vi.fn<(data: string) => void>()
      const onError = vi.fn<(error: Error) => void>()
      const held = heldGets()

      const { result } = renderHook({ http: httpClient }, () =>
        useHttp<string>('GET', '/api/tags', { onSuccess, onError }),
      )

      const pending = result.execute()
      result.reset()
      if (outcome === 'success') {
        await held.answer(0, 'late')
        await expect(pending).resolves.toBe('late')
        expect(onSuccess).toHaveBeenCalledExactlyOnceWith('late')
        expect(onError).not.toHaveBeenCalled()
      } else {
        const error = new Error('late failure')
        await held.fail(0, error)
        await expect(pending).resolves.toBeNull()
        // The package's real fetch client reports a transport rejection as its
        // own HttpError carrying the message; the callback still sees exactly
        // one failure, never the success branch.
        expect(onError).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ message: 'late failure' }),
        )
        expect(onSuccess).not.toHaveBeenCalled()
      }
      expect({
        data: get(result.data),
        loading: get(result.loading),
        error: get(result.error),
      }).toEqual({ data: null, loading: false, error: null })
      void result.execute()
      await held.answer(1, 'after reset')
      expect({
        data: get(result.data),
        loading: get(result.loading),
        error: get(result.error),
      }).toEqual({ data: 'after reset', loading: false, error: null })
    },
  )

  it.each(['success', 'failure'] as const)(
    'suppresses callbacks after unmount on %s while preserving the request return value',
    async (outcome) => {
      const httpClient = createTestHttpClient()
      const onSuccess = vi.fn<(data: string) => void>()
      const onError = vi.fn<(error: Error) => void>()
      const held = heldGets()

      const { result, unmount } = renderHook({ http: httpClient }, () =>
        useHttp<string>('GET', '/api/tags', { onSuccess, onError }),
      )
      const execute = result.execute
      const pending = execute()
      unmount()
      if (outcome === 'success') {
        await held.answer(0, 'late')
        await expect(pending).resolves.toBe('late')
      } else {
        await held.fail(0, new Error('late failure'))
        await expect(pending).resolves.toBeNull()
      }
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
      await expect(execute()).resolves.toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it('shows the newest immediate request when StrictMode replays the mount effect', async () => {
    const httpClient = createTestHttpClient()
    const onSuccess = vi.fn<(data: string) => void>()
    const held = heldGets()

    const { result } = renderHook({ http: httpClient }, () =>
      useHttp<string>('GET', '/api/tags', { immediate: true, onSuccess }),
    )

    // The immediate option issues its request once on mount.
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // StrictMode's mount replay, as the caller would see it: a second request
    // that takes ownership from the first.
    void result.execute()

    await held.answer(1, 'current mount')
    await held.answer(0, 'replayed mount')

    expect(get(result.data)).toBe('current mount')
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)).toBeNull()
    expect(onSuccess.mock.calls).toEqual([['current mount'], ['replayed mount']])
  })
})

describe('useStorageValue', () => {
  it('should load and set storage value', async () => {
    const storageProvider = createMemoryStorageProvider()

    const { result } = renderHook({ storage: storageProvider }, () =>
      useStorageValue<string>('theme', { defaultValue: 'light' }),
    )

    // Wait for initial load
    await vi.waitFor(() => {
      expect(get(result.loading)).toBe(false)
    })

    expect(get(result.value)).toBe('light')

    await result.setValue('dark')

    expect(get(result.value)).toBe('dark')
  })
})

describe('useLogger', () => {
  it('should return a logger instance', () => {
    const mock = createMockLoggerProvider()

    const { result } = renderHook({ logger: mock.provider }, () => useLogger('TestComponent'))

    expect(result).toBeDefined()
    expect(typeof result.info).toBe('function')

    result.info('test message')
    expect(mock.info).toHaveBeenCalled()
  })
})

describe('Provider errors', () => {
  // The hook is HANDED its store, so it must work with no provider at all: an
  // app that made its store with a provider package's own factory — never
  // calling `setProvider()` — had every page throw on mount, from a hook that
  // only ever calls `store.getState()` / `store.subscribe()`.
  it('should render useStore(store) with no StateProvider anywhere', async () => {
    const store = createMockStore({ count: 0 })

    const { result } = renderHook({}, () => useStore(store, { selector: (state) => state.count }))

    expect(get(result)).toBe(0)

    store.setState({ count: 1 })
    await flush()
    expect(get(result)).toBe(1)
  })

  it('should name the fix when useStateProvider is used outside StateProvider', () => {
    let thrown: unknown
    try {
      renderHook({}, () => useStateProvider())
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(Error)
    const message = thrown instanceof Error ? thrown.message : ''
    expect(message).toContain('useStateProvider must be used within a StateProvider')
    // The message has to carry the fix, not just the diagnosis: the import
    // line, the composition root that supplies the provider, and the hook to
    // reach for when the caller already holds a store.
    expect(message).toContain("import { setMoleculeContext } from '@molecule/app-svelte'")
    expect(message).toContain('setStateContext(provider)')
    expect(message).toContain('useStore(store)')
  })

  it('should throw when useAuth is used outside AuthProvider', () => {
    expect(() => renderHook({}, () => useAuth())).toThrow(
      'useAuthClient must be used within an AuthProvider',
    )
  })
})
