/**
 * Binding-case fakes for one area: browser chrome and a deferrable auth client
 * for the auth flow hooks (useLogin, useSignup, useChangePassword,
 * usePasswordReset, useOAuth, useProfileForm, useVerifyPaymentReturn).
 *
 * A case seeds this area through `context.areas.authFlows`; `control` steps call
 * the controls registered here (named `authFlows.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * The factory is a NO-OP unless the case seeds `context.areas.authFlows` — every
 * binding case in the kit runs every area's factory, and stubbing `window` (or
 * replacing the auth client) for a case that did not ask for it would change
 * another area's recorded calls.
 *
 * What lives here and why:
 *
 * - `auth`: a replacement auth client (overrides `services.auth`, the same way
 *   `fakes/core.ts` replaces `services.storage`) whose operations can be held
 *   PENDING until the `authFlows.settleAuth` control answers them. The kit's
 *   base fake resolves every operation on the next microtask, so the
 *   pending/in-between states of the `usePromise`-based hooks, a second call
 *   while the first is pending, and unmount-while-pending are unobservable
 *   without it. Outside state changes go through the `authFlows.auth` control
 *   (the kit's `auth` step drives the base fake this one replaces).
 * - `sessionStorage`: a recorded in-memory store (the OAuth hooks stash the
 *   initiating provider under `oauth_provider`).
 * - `fetch`: scripted `window.fetch` responses for the OAuth code exchange,
 *   which bypasses the kit's HTTP client and calls `fetch` directly.
 * - `location` / `window` / `popup`: the OAuth hooks read `window.location`,
 *   open popups with `window.open` and relay results with `postMessage`.
 *   `location.search` cannot be stubbed in jsdom (the `Location` accessors are
 *   non-configurable), so a seeded `location` is applied through the REAL
 *   `history.replaceState` before mount and restored afterwards; the hook's own
 *   `history.replaceState` calls go through a recorder that still delegates to
 *   the real history, so the URL cleanup is observable.
 *
 * Every fake is deterministic: no `Date.now()`, no `Math.random()`, no real
 * network — the only clock-driven behavior (the popup close-poll and its hard
 * timeout) belongs to cases that set `fakeTimers` and advance them explicitly.
 *
 * @module
 */

import type { AuthClient, AuthState } from '@molecule/app-auth'

import type { AreaFakesFactory } from '../spec.js'

/** Receives a recorded call (the kit normalizes the arguments). */
type Recorder = (name: string, args: unknown[]) => void

/** The user record every fake client here works with. */
type User = Record<string, unknown>

/** One scripted `window.fetch` response, consumed in order. */
export interface FetchScript {
  /** URL the request must hit (exact string); omit to match any request. */
  url?: string
  /** Response status (default `200`). */
  status?: number
  /** The body `response.json()` resolves with. */
  data?: unknown
  /** Response headers, lowercase names (`{ authorization: 'Bearer tok' }`). */
  headers?: Record<string, string>
  /** Reject with `new Error(message)` instead of answering. */
  networkError?: string
  /** Stay pending until the `authFlows.answerFetch` control answers it. */
  defer?: boolean
}

/**
 * A replacement auth client for cases that need to hold an operation pending
 * (or resolve it with something other than the kit fake's default). Mirrors the
 * kit's base fake for every behavior it does not override, except the session
 * revision: it changes only when the session actually changes (sign-in,
 * sign-out, session adoption, an outside `authFlows.auth` change), never on a
 * profile update — the `@molecule/app-auth` contract `useProfileForm`'s
 * same-account logic depends on.
 */
export interface AuthFlowsAuthSeed {
  /** Initial status (default `'unauthenticated'`). */
  status?: 'authenticated' | 'unauthenticated' | 'loading' | 'unavailable'
  /** Initial cached user (default `null`). */
  user?: User | null
  /**
   * Client methods (`'login'`, `'register'`, `'updatePassword'`, …) whose calls
   * stay pending until the `authFlows.settleAuth` control answers them.
   */
  defer?: readonly string[]
  /** Methods that reject with `new Error(message)` instead of running. */
  errors?: Readonly<Record<string, string>>
  /**
   * What `updateProfile` resolves with and publishes as the user (default: the
   * patch merged into the current user) — a server that canonicalizes or clears
   * a field.
   */
  updateProfileReturns?: User
  /**
   * What `login`/`register` resolve with (default
   * `{ user: { id: 'u1' }, accessToken: 'token' }`, signing the client in).
   */
  result?: { user?: User; accessToken?: string }
}

/** The page URL a case mounts on, applied through the real `history.replaceState`. */
export interface AuthFlowsLocationSeed {
  /** Path (default `'/'`). */
  pathname?: string
  /** Query string including `'?'` (default none). */
  search?: string
  /** Fragment including `'#'` (default none). */
  hash?: string
}

/** What a case can seed for this area (`context.areas.authFlows`). */
export interface AuthFlowsSeed {
  /** Builds the deferrable auth client this area provides as `services.auth`. */
  auth?: AuthFlowsAuthSeed
  /** Seeds `sessionStorage` contents; every hook access is recorded. */
  sessionStorage?: Record<string, string>
  /** Scripts `window.fetch` (the OAuth code exchange). */
  fetch?: readonly FetchScript[]
  /** Mounts the page on this URL and records the hook's `history.replaceState` calls. */
  location?: AuthFlowsLocationSeed
  /** `window.open` popups; `blocked: true` makes every open return null. */
  popup?: { blocked?: boolean }
  /** Popup-callback identity: `window.name` and whether `window.opener` exists. */
  window?: { name?: string; opener?: boolean }
}

/** The `AuthState` snapshot derivation the kit's base fake uses, mirrored here. */
const authState = (status: AuthState<User>['status'], user: User | null): AuthState<User> => ({
  status,
  initialized: status !== 'loading',
  authenticated: status === 'authenticated',
  user: status === 'authenticated' || status === 'unavailable' ? user : null,
  loading: status === 'loading',
  error: null,
})

/** One held-pending call of the fake auth client. */
interface PendingAuthCall {
  /** Resolves the caller's promise. */
  resolve: (value: unknown) => void
  /** Rejects the caller's promise. */
  reject: (error: Error) => void
  /** The state change + result that run when the control settles the call. */
  action: () => unknown
}

/**
 * Builds the area's deferrable auth client. Behaves like the kit's base fake
 * (same recorded `auth.<method>` names, same result shapes) except where the
 * seed asks for pending calls, rejections or a canned result.
 *
 * @param seed - The `auth` seed.
 * @param record - Receives every call.
 * @returns The client, its outside-change control, its settle control and its listener count.
 */
function createDeferredAuthClient(
  seed: AuthFlowsAuthSeed,
  record: Recorder,
): {
  client: AuthClient<User>
  setAuth: (status: AuthState<User>['status'], user?: User) => void
  settle: (method: string, outcome: 'resolve' | 'reject', message?: unknown) => void
  listenerCount: () => number
} {
  let state = authState(seed.status ?? 'unauthenticated', seed.user ?? null)
  let revision = 1
  let token: string | null = state.authenticated ? 'token' : null
  const listeners = new Set<(s: AuthState<User>) => void>()
  const pending = new Map<string, PendingAuthCall[]>()

  const emit = (): void => {
    for (const listener of [...listeners]) listener(state)
  }
  const signIn = (user: User): { user: User; accessToken: string } => {
    token = seed.result?.accessToken ?? 'token'
    state = authState('authenticated', user)
    revision++
    emit()
    return { user, accessToken: token }
  }
  const call = (method: string, args: unknown[], action: () => unknown): Promise<unknown> => {
    record(`auth.${method}`, args)
    const error = seed.errors?.[method]
    if (error) return Promise.reject(new Error(error))
    if (seed.defer?.includes(method)) {
      return new Promise((resolve, reject) => {
        const queue = pending.get(method) ?? []
        queue.push({ resolve, reject, action })
        pending.set(method, queue)
      })
    }
    return Promise.resolve(action())
  }
  const subscribe = (callback: (s: AuthState<User>) => void): (() => void) => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }

  const client: AuthClient<User> = {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    getSessionRevision: () => revision,
    setUser: (user) => {
      record('auth.setUser', [user])
      state = { ...state, user }
    },
    getAccessToken: () => token,
    setAccessToken: (next) => {
      record('auth.setAccessToken', [next])
      token = next
    },
    setSession: (session) => {
      record('auth.setSession', [session])
      token = (session as { accessToken?: string }).accessToken ?? 'token'
      state = authState('authenticated', (session as { user?: User }).user ?? null)
      revision++
      emit()
    },
    getRefreshToken: () => null,
    login: (credentials) =>
      call(
        'login',
        [credentials],
        () =>
          signIn({
            id: 'u1',
            ...((credentials as { email?: unknown }).email === undefined
              ? {}
              : { email: (credentials as { email: unknown }).email }),
            ...(seed.result?.user ?? {}),
          }) as never,
      ) as never,
    logout: () =>
      call('logout', [], () => {
        token = null
        state = authState('unauthenticated', null)
        revision++
        emit()
        return undefined
      }) as never,
    register: (data) =>
      call('register', [data], () => {
        const { password: _password, ...profile } = data as Record<string, unknown>
        return signIn({ id: 'u1', ...profile, ...(seed.result?.user ?? {}) }) as never
      }) as never,
    refresh: () =>
      call(
        'refresh',
        [],
        () => ({ user: state.user as User, accessToken: token ?? 'token' }) as never,
      ) as never,
    requestPasswordReset: (data) => call('requestPasswordReset', [data], () => undefined) as never,
    confirmPasswordReset: (data) => call('confirmPasswordReset', [data], () => undefined) as never,
    updateProfile: (data) =>
      call('updateProfile', [data], () => {
        const user = seed.updateProfileReturns ?? { ...(state.user ?? {}), ...(data as User) }
        state = { ...state, user }
        emit()
        return user
      }) as never,
    changePassword: (oldPassword, newPassword) =>
      call('changePassword', [oldPassword, newPassword], () => undefined) as never,
    initialize: async () => undefined,
    whenRestored: async () => undefined,
    subscribe,
    onAuthChange: subscribe,
    addEventListener: () => () => undefined,
    destroy: () => listeners.clear(),
  }

  return {
    client,
    setAuth: (status, user) => {
      if (status === 'authenticated' && !token) token = 'token'
      if (status === 'unauthenticated') token = null
      state = authState(status, user ?? state.user)
      revision++
      emit()
    },
    settle: (method, outcome, message) => {
      const next = pending.get(method)?.shift()
      if (!next) throw new Error(`conformance: auth.${method} has no pending call to settle`)
      if (outcome === 'reject') {
        next.reject(new Error(String(message ?? 'rejected')))
        return
      }
      next.resolve(next.action())
    },
    listenerCount: () => listeners.size,
  }
}

/** The popup `window.open` hands the hook. */
interface FakePopup {
  /** Whether the popup reads as closed. */
  closed: boolean
  /** Focuses the popup (recorded). */
  focus: () => void
  /** Closes the popup (recorded, flips {@link FakePopup.closed}). */
  close: () => void
}

/** What the popup relay controls dispatch: one message event against the open popup. */
export interface MessageControlArgs {
  /** Which window the event claims to come from (default the popup we opened). */
  from?: 'popup' | 'stranger'
  /** The event origin (default our own; `'foreign'` is another origin). */
  origin?: 'self' | 'foreign'
  /** Whether the message carries the private relay type (default yes). */
  type?: 'valid' | 'wrong'
  /** Whether the relayed exchange succeeded (default `true`). */
  ok?: boolean
  /** The bearer token the popup relays. */
  token?: string
  /** The user the popup relays. */
  user?: User
  /** The failure message the popup relays. */
  error?: string
}

/**
 * Builds this area's fakes for one case.
 *
 * @param context - The case context (`context.areas?.authFlows` is this area's seed).
 * @param record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createAuthFlowsFakes: AreaFakesFactory = (context, record) => {
  const seed = (context.areas?.authFlows ?? {}) as AuthFlowsSeed
  if (
    !seed.auth &&
    !seed.sessionStorage &&
    !seed.fetch &&
    !seed.location &&
    !seed.popup &&
    !seed.window
  ) {
    return {}
  }

  const restore: (() => void)[] = []
  const patch = (key: string, value: unknown): void => {
    const target = window as unknown as Record<string, unknown>
    const had = key in target
    const previous = target[key]
    target[key] = value
    restore.push(() => {
      if (had) target[key] = previous
      else delete target[key]
    })
  }

  // --- The deferrable auth client (replaces services.auth for this case). ---
  const deferredAuth = seed.auth ? createDeferredAuthClient(seed.auth, record) : null
  if (deferredAuth) {
    // The base fake's listener count would report a client nothing subscribed
    // to; this area's count is the one that matters while it is provided.
    restore.push(() => deferredAuth.client.destroy())
  }

  // --- sessionStorage: a recorded in-memory store. ---
  if (seed.sessionStorage) {
    const contents = new Map(Object.entries(seed.sessionStorage))
    const store = {
      length: 0,
      key: (index: number): string | null => [...contents.keys()][index] ?? null,
      getItem: (key: string): string | null => {
        record('sessionStorage.getItem', [key])
        return contents.get(key) ?? null
      },
      setItem: (key: string, value: string): void => {
        record('sessionStorage.setItem', [key, value])
        contents.set(key, value)
      },
      removeItem: (key: string): void => {
        record('sessionStorage.removeItem', [key])
        contents.delete(key)
      },
      clear: (): void => {
        record('sessionStorage.clear', [])
        contents.clear()
      },
    }
    const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: store,
    })
    restore.push(() => {
      if (descriptor) Object.defineProperty(window, 'sessionStorage', descriptor)
    })
  }

  // --- window.history: record replaceState, still apply it to the real URL. ---
  if (seed.location) {
    const { pathname = '/', search = '', hash = '' } = seed.location
    const realHistory = window.history
    realHistory.replaceState(null, '', `${pathname}${search}${hash}`)
    const historyStub = {
      replaceState: (state: unknown, title: string, url: string | URL | null): void => {
        record('history.replaceState', [String(url)])
        realHistory.replaceState(state, title, url)
      },
    }
    const descriptor = Object.getOwnPropertyDescriptor(window, 'history')
    Object.defineProperty(window, 'history', {
      configurable: true,
      writable: true,
      value: historyStub,
    })
    restore.push(() => {
      if (descriptor) Object.defineProperty(window, 'history', descriptor)
      realHistory.replaceState(null, '', '/')
    })
  }

  // --- window.name / window.opener / window.close: the popup-callback identity. ---
  if (seed.window) {
    if (seed.window.name !== undefined) patch('name', seed.window.name)
    if (seed.window.opener) {
      const opener = {
        postMessage: (message: unknown, targetOrigin: string): void => {
          record('opener.postMessage', [message, targetOrigin])
        },
      }
      patch('opener', opener)
      patch('close', (): void => {
        record('window.close', [])
      })
    }
  }

  // --- message listeners: recorded, and addressable by the relay control. ---
  const messageListeners = new Set<(event: unknown) => void>()
  const realAddEventListener = window.addEventListener.bind(window) as (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: unknown,
  ) => void
  const realRemoveEventListener = window.removeEventListener.bind(window) as (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: unknown,
  ) => void
  patch('addEventListener', (type: string, listener: EventListener, options?: unknown): void => {
    if (type === 'message') {
      messageListeners.add(listener as (event: unknown) => void)
      record('window.addEventListener', ['message'])
    }
    realAddEventListener(type, listener as EventListenerOrEventListenerObject, options)
  })
  patch('removeEventListener', (type: string, listener: EventListener, options?: unknown): void => {
    if (type === 'message') {
      messageListeners.delete(listener as (event: unknown) => void)
      record('window.removeEventListener', ['message'])
    }
    realRemoveEventListener(type, listener as EventListenerOrEventListenerObject, options)
  })

  // --- window.open popups. ---
  let popup: FakePopup | null = null
  if (seed.popup) {
    patch('open', (url?: string, name?: string, features?: string): FakePopup | null => {
      record('window.open', [url, name, features])
      if (seed.popup?.blocked) return null
      const opened: FakePopup = {
        closed: false,
        focus: () => {
          record('popup.focus', [])
        },
        close: () => {
          record('popup.close', [])
          opened.closed = true
        },
      }
      popup = opened
      return opened
    })
  }

  // --- window.fetch: scripted responses for the OAuth code exchange. ---
  interface PendingFetch {
    script: FetchScript
    resolve: (response: unknown) => void
    reject: (error: Error) => void
  }
  const scripts = (seed.fetch ?? []).map((script) => ({ script, used: false }))
  const pendingFetches: PendingFetch[] = []
  if (seed.fetch) {
    patch('fetch', (url: string | URL, init?: RequestInit): Promise<unknown> => {
      record('window.fetch', [
        String(url),
        {
          ...(init?.method === undefined ? {} : { method: init.method }),
          ...(init?.headers === undefined ? {} : { headers: init.headers }),
          ...(init?.credentials === undefined ? {} : { credentials: init.credentials }),
          ...(init?.body === undefined ? {} : { body: init.body }),
        },
      ])
      const entry = scripts.find(
        (candidate) =>
          !candidate.used &&
          (candidate.script.url === undefined || candidate.script.url === String(url)),
      )
      if (!entry) throw new Error(`conformance: no fetch script for ${String(url)}`)
      entry.used = true
      const respond = (): Record<string, unknown> => {
        const status = entry.script.status ?? 200
        const headers = entry.script.headers ?? {}
        return {
          ok: status < 400,
          status,
          headers: { get: (name: string): string | null => headers[name.toLowerCase()] ?? null },
          json: async () => entry.script.data,
        }
      }
      if (entry.script.defer) {
        return new Promise((resolve, reject) => {
          pendingFetches.push({ script: entry.script, resolve, reject })
        })
      }
      if (entry.script.networkError) return Promise.reject(new Error(entry.script.networkError))
      return Promise.resolve(respond())
    })
  }

  return {
    ...(deferredAuth ? { services: { auth: deferredAuth.client } } : {}),
    controls: {
      /** Answers the oldest pending call of a deferred auth operation. */
      'authFlows.settleAuth': (method: unknown, outcome: unknown, message?: unknown): void => {
        if (!deferredAuth)
          throw new Error('conformance: authFlows.settleAuth needs areas.authFlows.auth')
        deferredAuth.settle(String(method), outcome === 'reject' ? 'reject' : 'resolve', message)
      },
      /** Changes auth state from outside, like the kit's `auth` step. */
      'authFlows.auth': (status: unknown, user?: unknown): void => {
        if (!deferredAuth) throw new Error('conformance: authFlows.auth needs areas.authFlows.auth')
        deferredAuth.setAuth(status as AuthState<User>['status'], user as User | undefined)
      },
      /** Marks the open popup closed (the user closed it without completing). */
      'authFlows.closePopup': (): void => {
        if (!popup) throw new Error('conformance: no popup is open')
        popup.closed = true
      },
      /** Dispatches one message event to the hook's `message` listeners. */
      'authFlows.message': (raw: unknown): void => {
        const args = (raw ?? {}) as MessageControlArgs
        const data = {
          type: args.type === 'wrong' ? 'not-our-type' : 'molecule:oauth-result',
          ok: args.ok !== false,
          ...(args.token === undefined ? {} : { token: args.token }),
          ...(args.user === undefined ? {} : { user: args.user }),
          ...(args.error === undefined ? {} : { error: args.error }),
        }
        const event = {
          origin: args.origin === 'foreign' ? 'https://evil.example' : window.location.origin,
          source: args.from === 'stranger' ? { stranger: true } : popup,
          data,
        }
        for (const listener of [...messageListeners]) listener(event)
      },
      /** Answers the oldest pending window.fetch call. */
      'authFlows.answerFetch': (
        status: unknown,
        data: unknown,
        headers: unknown,
        networkError: unknown,
      ): void => {
        const next = pendingFetches.shift()
        if (!next) throw new Error('conformance: no deferred fetch is pending')
        if (networkError) {
          next.reject(new Error(String(networkError)))
          return
        }
        const code = Number(status ?? 200)
        next.resolve({
          ok: code < 400,
          status: code,
          headers: {
            get: (name: string): string | null =>
              ((headers as Record<string, string> | undefined) ?? {})[name.toLowerCase()] ?? null,
          },
          json: async () => data,
        })
      },
    },
    listeners: (): Record<string, number> => ({
      ...(deferredAuth ? { auth: deferredAuth.listenerCount() } : {}),
      ...(seed.popup ? { 'window.message': messageListeners.size } : {}),
    }),
    dispose: (): void => {
      for (const undo of restore.reverse()) undo()
    },
  }
}
