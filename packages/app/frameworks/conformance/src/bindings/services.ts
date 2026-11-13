/**
 * The services a binding case runs against, identical for every framework.
 *
 * Every adapter hands these to its own providers (React's providers, Vue's
 * plugins, Solid's `MoleculeProvider`, Svelte's `setMoleculeContext`,
 * Angular's `provide*` functions). Each call a hook makes on a service is
 * recorded (`auth.login`, `http.get`, `storage.set`, `logger.warn`, …), so
 * service use is compared like callback calls. Steps change services from
 * outside through {@link BindingControls}.
 *
 * @module
 */

import type { AuthClient, AuthState } from '@molecule/app-auth'
import {
  type FullRequestConfig,
  type HttpClient,
  HttpError,
  type HttpResponse,
  type RequestConfig,
} from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import type { Logger, LoggerProvider, LogLevel } from '@molecule/app-logger'
import { createMemoryRouter, type Router } from '@molecule/app-routing'
import { createSimpleStateProvider } from '@molecule/app-state'
import { createMemoryStorageProvider, type StorageProvider } from '@molecule/app-storage'
import {
  createDarkTheme,
  createLightTheme,
  type Theme,
  type ThemeProvider,
} from '@molecule/app-theme'

import type { ServiceCallSink } from '../ui/fakes.js'
import { areaFakesFactories } from './fakes/index.js'
import type { AuthOperation, BindingContext, BindingServices, HttpScript } from './spec.js'
import { normalizeValue } from './values.js'

type User = Record<string, unknown>

/** Kit-side handles that steps use to change services from outside. */
export interface BindingControls {
  /** Sets auth state as if another tab or a token refresh changed it. */
  setAuth(status: AuthState<User>['status'], user?: User): void
  /** Answers the oldest deferred request for this method + URL. */
  answerHttp(answer: {
    method: string
    url: string
    status?: number
    data?: unknown
    networkError?: string
  }): void
  /** Writes a storage key from outside (not recorded as a hook's call). */
  writeStorage(key: string, value: unknown): Promise<void>
  /** Switches the theme mode as if another part of the app did (not recorded). */
  setThemeMode(mode: 'light' | 'dark'): void
  /** Calls a control an area fakes module registered (a `control` step). */
  control(name: string, args: unknown[]): Promise<void>
  /** Undoes every area's global changes after the case. */
  dispose(): Promise<void>
  /** Current listener count per subscribable service, for leak checks. */
  listeners(): Record<string, number>
}

/** Services plus their controls. */
export interface BindingHarnessServices {
  services: BindingServices
  controls: BindingControls
}

const authState = (status: AuthState<User>['status'], user: User | null): AuthState<User> => ({
  status,
  initialized: status !== 'loading',
  authenticated: status === 'authenticated',
  user: status === 'authenticated' || status === 'unavailable' ? user : null,
  loading: status === 'loading',
  error: null,
})

/**
 * Builds a fake auth client. Login and register sign in as
 * `{ id: 'u1', email }`; logout signs out; every operation is recorded and
 * can be made to fail.
 *
 * @param context - The case context.
 * @param record - Receives every call.
 * @returns The client and a way to change its state from outside.
 */
function createBindingAuthClient(
  context: BindingContext,
  record: ServiceCallSink,
): { client: AuthClient<User>; setAuth: BindingControls['setAuth']; listenerCount: () => number } {
  let state = authState(context.auth?.status ?? 'unauthenticated', context.auth?.user ?? null)
  let revision = 1
  let token: string | null = state.authenticated ? 'token' : null
  const listeners = new Set<(s: AuthState<User>) => void>()
  const set = (next: AuthState<User>): void => {
    state = next
    revision++
    for (const l of [...listeners]) l(state)
  }
  const fail = (op: AuthOperation): void => {
    const message = context.authErrors?.[op]
    if (message) throw new Error(message)
  }
  const signIn = (user: User): { user: User; accessToken: string } => {
    token = 'token'
    set(authState('authenticated', user))
    return { user, accessToken: 'token' }
  }
  const subscribe = (cb: (s: AuthState<User>) => void): (() => void) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }
  const client: AuthClient<User> = {
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    getSessionRevision: () => revision,
    setUser: (user) => {
      record('auth.setUser', [user])
      set({ ...state, user })
    },
    getAccessToken: () => token,
    setAccessToken: (next) => {
      record('auth.setAccessToken', [next])
      token = next
    },
    setSession: (session) => {
      record('auth.setSession', [session])
      token = (session as { accessToken?: string }).accessToken ?? 'token'
      set(authState('authenticated', (session as { user?: User }).user ?? null))
    },
    getRefreshToken: () => null,
    login: async (credentials) => {
      record('auth.login', [credentials])
      fail('login')
      const email = (credentials as { email?: unknown }).email
      return signIn({ id: 'u1', ...(email === undefined ? {} : { email }) }) as never
    },
    logout: async () => {
      record('auth.logout', [])
      fail('logout')
      token = null
      set(authState('unauthenticated', null))
    },
    register: async (data) => {
      record('auth.register', [data])
      fail('register')
      const { password: _password, ...profile } = data as Record<string, unknown>
      return signIn({ id: 'u1', ...profile }) as never
    },
    refresh: async () => {
      record('auth.refresh', [])
      fail('refresh')
      return { user: state.user as User, accessToken: token ?? 'token' } as never
    },
    requestPasswordReset: async (data) => {
      record('auth.requestPasswordReset', [data])
      fail('requestPasswordReset')
    },
    confirmPasswordReset: async (data) => {
      record('auth.confirmPasswordReset', [data])
      fail('confirmPasswordReset')
    },
    updateProfile: async (data) => {
      record('auth.updateProfile', [data])
      fail('updateProfile')
      const user = { ...(state.user ?? {}), ...(data as User) }
      set({ ...state, user })
      return user
    },
    changePassword: async (oldPassword, newPassword) => {
      record('auth.changePassword', [oldPassword, newPassword])
      fail('changePassword')
    },
    initialize: async () => undefined,
    whenRestored: async () => undefined,
    subscribe,
    onAuthChange: subscribe,
    addEventListener: () => () => undefined,
    destroy: () => listeners.clear(),
  }
  return {
    client,
    setAuth: (status, user) => set(authState(status, user ?? state.user)),
    listenerCount: () => listeners.size,
  }
}

interface PendingRequest {
  method: string
  url: string
  config: FullRequestConfig
  resolve: (response: HttpResponse) => void
  reject: (error: unknown) => void
}

/**
 * Builds a scripted HTTP client: each request takes the first unused script
 * entry with its method and URL; an unscripted request answers 404.
 *
 * @param scripts - The case's responses.
 * @param record - Receives every request.
 * @returns The client and a way to answer deferred requests.
 */
function createScriptedHttpClient(
  scripts: HttpScript[],
  record: ServiceCallSink,
): { client: HttpClient; answer: BindingControls['answerHttp'] } {
  const unused = scripts.map((script) => ({ script, used: false }))
  const pending: PendingRequest[] = []
  let authToken: string | null = null
  const authErrorHandlers = new Set<() => void>()

  const respond = (
    config: FullRequestConfig,
    status: number,
    data: unknown,
    headers: Record<string, string> = {},
  ): HttpResponse => {
    const response: HttpResponse = { data, status, statusText: String(status), headers, config }
    if (status >= 400) {
      throw new HttpError(
        `Request failed with status ${status}`,
        status,
        response,
        config,
        'http.error.requestFailed',
      )
    }
    return response
  }
  const networkError = (config: FullRequestConfig, message: string): HttpError =>
    new HttpError(message, 0, undefined, config, 'http.error.networkError')

  const request = async <T>(config: FullRequestConfig): Promise<HttpResponse<T>> => {
    const method = config.method.toUpperCase()
    record(`http.${method.toLowerCase()}`, [
      {
        url: config.url,
        ...(config.data === undefined ? {} : { data: config.data }),
        ...(config.params ? { params: config.params } : {}),
      },
    ])
    const entry = unused.find(
      (e) => !e.used && e.script.method.toUpperCase() === method && e.script.url === config.url,
    )
    if (!entry) return respond(config, 404, { error: 'Not found' }) as HttpResponse<T>
    entry.used = true
    const { script } = entry
    if (script.defer) {
      return new Promise<HttpResponse<T>>((resolve, reject) => {
        pending.push({
          method,
          url: config.url,
          config,
          resolve: resolve as (r: HttpResponse) => void,
          reject,
        })
      })
    }
    if (script.networkError) throw networkError(config, script.networkError)
    return respond(config, script.status ?? 200, script.data, script.headers) as HttpResponse<T>
  }
  const withMethod =
    (method: string) =>
    <T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> =>
      request<T>({ ...config, method, url } as FullRequestConfig)
  const withBody =
    (method: string) =>
    <T>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> =>
      request<T>({ ...config, method, url, data } as FullRequestConfig)

  const client: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    request,
    get: withMethod('GET'),
    delete: withMethod('DELETE'),
    post: withBody('POST'),
    put: withBody('PUT'),
    patch: withBody('PATCH'),
    addRequestInterceptor: () => () => undefined,
    addResponseInterceptor: () => () => undefined,
    addErrorInterceptor: () => () => undefined,
    setAuthToken: (token) => {
      record('http.setAuthToken', [token])
      authToken = token
    },
    getAuthToken: () => authToken,
    onAuthError: (handler) => {
      authErrorHandlers.add(handler)
      return () => {
        authErrorHandlers.delete(handler)
      }
    },
  }
  return {
    client,
    answer: ({ method, url, status, data, networkError: message }) => {
      const index = pending.findIndex((p) => p.method === method.toUpperCase() && p.url === url)
      if (index < 0) throw new Error(`conformance: no deferred ${method} ${url} is pending`)
      const [request] = pending.splice(index, 1)
      if (message) {
        request.reject(networkError(request.config, message))
        return
      }
      try {
        request.resolve(respond(request.config, status ?? 200, data))
      } catch (error) {
        request.reject(error)
      }
    },
  }
}

/**
 * Wraps the in-memory storage provider so writes are recorded.
 *
 * @param seed - Initial contents.
 * @param record - Receives every write.
 * @returns The recorded provider and the unrecorded one underneath (for outside writes).
 */
function createRecordedStorage(
  seed: Record<string, unknown>,
  record: ServiceCallSink,
): { provider: StorageProvider; inner: StorageProvider } {
  const inner = createMemoryStorageProvider()
  for (const [key, value] of Object.entries(seed)) void inner.set(key, value)
  const provider: StorageProvider = {
    ...inner,
    get: (key) => inner.get(key),
    keys: () => inner.keys(),
    set: async (key, value) => {
      record('storage.set', [key, value])
      await inner.set(key, value)
    },
    remove: async (key) => {
      record('storage.remove', [key])
      await inner.remove(key)
    },
    clear: async () => {
      record('storage.clear', [])
      await inner.clear()
    },
  }
  return { provider, inner }
}

/**
 * A theme provider with a light and a dark theme. `setTheme` records what it
 * was given: a theme name as the string, a theme object as `{ theme: name }`
 * (so a binding that passes an object where React passes a name differs).
 *
 * @param mode - Initial mode.
 * @param record - Receives every call a hook makes.
 * @returns The provider, an unrecorded mode switch and the listener count.
 */
function createBindingThemeProvider(
  mode: 'light' | 'dark',
  record: ServiceCallSink,
): {
  provider: ThemeProvider
  setMode: (mode: 'light' | 'dark') => void
  listenerCount: () => number
} {
  const light = createLightTheme()
  const dark = createDarkTheme()
  let theme: Theme = mode === 'dark' ? dark : light
  const listeners = new Set<(t: Theme) => void>()
  const emit = (): void => {
    for (const l of [...listeners]) l(theme)
  }
  const byName = (name: string): Theme | undefined => [light, dark].find((t) => t.name === name)
  const provider: ThemeProvider = {
    getTheme: () => theme,
    setTheme: (next) => {
      record('theme.setTheme', [typeof next === 'string' ? next : { theme: next?.name ?? null }])
      const resolved = typeof next === 'string' ? byName(next) : next
      if (!resolved) return
      theme = resolved
      emit()
    },
    toggleMode: () => {
      record('theme.toggleMode', [])
      theme = theme.mode === 'dark' ? light : dark
      emit()
    },
    subscribe: (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    getThemes: () => [light, dark],
  }
  return {
    provider,
    setMode: (next) => {
      theme = next === 'dark' ? dark : light
      emit()
    },
    listenerCount: () => listeners.size,
  }
}

/**
 * Wraps a router so its route subscriptions are counted.
 *
 * @param router - The memory router.
 * @returns The wrapped router and its listener count.
 */
function countRouterListeners(router: Router): { router: Router; listenerCount: () => number } {
  let count = 0
  return {
    router: {
      ...router,
      subscribe: (listener) => {
        count++
        const off = router.subscribe(listener)
        let active = true
        return () => {
          if (active) count--
          active = false
          off()
        }
      },
    },
    listenerCount: () => count,
  }
}

/**
 * A logger provider that records every message (level, logger name, message)
 * instead of printing it.
 *
 * @param record - Receives every log call.
 * @returns The provider.
 */
function createRecordingLoggerProvider(record: ServiceCallSink): LoggerProvider {
  let level: LogLevel = 'info'
  let enabled = true
  const make = (name: string, context: Record<string, unknown> = {}): Logger => {
    const extra = Object.keys(context).length > 0 ? [{ $context: context }] : []
    const log =
      (lvl: LogLevel) =>
      (message: string | Error, ...args: unknown[]): void =>
        record(`logger.${lvl}`, [
          name,
          message instanceof Error ? message.message : message,
          ...args,
          ...extra,
        ])
    const logger: Logger = {
      trace: log('trace'),
      debug: log('debug'),
      info: log('info'),
      warn: log('warn'),
      error: log('error'),
      setLevel: (next) => {
        level = next
      },
      getLevel: () => level,
      child: (child) => make(name ? `${name}:${child}` : child, context),
      withContext: (more) => make(name, { ...context, ...more }),
      addTransport: () => {
        record('logger.addTransport', [name])
        return () => undefined
      },
      removeTransport: () => record('logger.removeTransport', [name]),
    }
    return logger
  }
  return {
    getLogger: (name) => make(name ?? ''),
    createLogger: (nameOrConfig) =>
      make(typeof nameOrConfig === 'string' ? nameOrConfig : (nameOrConfig.name ?? '')),
    setLevel: (next) => {
      level = next
    },
    getLevel: () => level,
    addTransport: () => {
      record('logger.addTransport', [])
      return () => undefined
    },
    enable: () => {
      enabled = true
    },
    disable: () => {
      enabled = false
    },
    isEnabled: () => enabled,
  }
}

/**
 * Builds a binding case's services and the controls its steps use.
 *
 * @param context - The case context.
 * @param record - Receives every service call.
 * @returns Services and controls.
 */
export function buildBindingServices(
  context: BindingContext = {},
  record: ServiceCallSink,
): BindingHarnessServices {
  const sink: ServiceCallSink = (name, args) => record(name, args.map(normalizeValue))
  const auth = createBindingAuthClient(context, sink)
  const http = createScriptedHttpClient(context.http ?? [], sink)
  const storage = createRecordedStorage(context.storage ?? {}, sink)
  const theme = createBindingThemeProvider(context.theme ?? 'light', sink)
  const router = countRouterListeners(
    createMemoryRouter({ initialEntries: [context.route ?? '/'] }),
  )
  // A fresh i18n provider per case, also bonded globally: hooks that translate
  // through the bond (provider-missing errors) and through the context see one provider.
  const i18nBase = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: context.translations?.en },
    { code: 'fr', name: 'French', nativeName: 'Français', translations: context.translations?.fr },
    { code: 'de', name: 'German', nativeName: 'Deutsch', translations: context.translations?.de },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      direction: 'rtl',
      translations: context.translations?.ar,
    },
  ])
  let i18nListeners = 0
  const i18n = {
    ...i18nBase,
    onLocaleChange: (listener: (locale: string) => void) => {
      i18nListeners++
      const off = i18nBase.onLocaleChange(listener)
      let active = true
      return () => {
        if (active) i18nListeners--
        active = false
        off()
      }
    },
  }
  setI18nProvider(i18n)
  const areas = areaFakesFactories.map((factory) => factory(context, sink))
  const services: BindingServices = {
    i18n,
    router: router.router,
    theme: theme.provider,
    auth: auth.client,
    http: http.client,
    storage: storage.provider,
    state: createSimpleStateProvider(),
    logger: createRecordingLoggerProvider(sink),
    ...Object.assign({}, ...areas.map((area) => area.services ?? {})),
  }
  const areaControls: Record<string, (...args: unknown[]) => unknown> = Object.assign(
    {},
    ...areas.map((area) => area.controls ?? {}),
  )
  return {
    services,
    controls: {
      setAuth: auth.setAuth,
      answerHttp: http.answer,
      writeStorage: (key, value) => storage.inner.set(key, value),
      setThemeMode: theme.setMode,
      control: async (name, args) => {
        const control = areaControls[name]
        if (!control) throw new Error(`conformance: no area registered the control ${name}`)
        await control(...args)
      },
      dispose: async () => {
        for (const area of areas) await area.dispose?.()
      },
      listeners: () => ({
        auth: auth.listenerCount(),
        i18n: i18nListeners,
        router: router.listenerCount(),
        theme: theme.listenerCount(),
        ...Object.assign({}, ...areas.map((area) => area.listeners?.() ?? {})),
      }),
    },
  }
}
