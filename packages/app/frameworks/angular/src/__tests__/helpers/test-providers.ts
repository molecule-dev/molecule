/**
 * Fully typed mock bond providers for the Angular binding's tests.
 *
 * Every factory returns the real contract type, so a test passes the mock
 * wherever the service under test takes the provider. Members the tests drive
 * are `vi.fn` mocks — use `vi.mocked(provider.member)` to override a return
 * value or assert a call.
 *
 * @module
 */

import { vi } from 'vitest'

import type {
  AuthClient,
  AuthEventListener,
  AuthResult,
  AuthSessionSeed,
  AuthState,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterData,
} from '@molecule/app-auth'
import type {
  ErrorInterceptor,
  HttpClient,
  HttpMethod,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/app-http'
import type {
  DateFormatOptions,
  I18nProvider,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from '@molecule/app-i18n'
import type {
  Logger,
  LoggerConfig,
  LoggerProvider,
  LogLevel,
  LogTransport,
} from '@molecule/app-logger'
import type {
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'
import type { StateProvider, Store } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeColors, ThemeProvider } from '@molecule/app-theme'

const notImplemented = (what: string): Promise<never> =>
  Promise.reject(new Error(`${what} is not implemented by the test provider factory`))

/**
 * Creates a full {@link AuthClient} mock. Session reads return a signed-out
 * state; the credential methods reject until a test overrides them through
 * `vi.mocked`.
 *
 * @template T - The user profile the client stands in for.
 * @returns A mock auth client that satisfies `AuthClient<T>`.
 */
export function createTestAuthClient<T = unknown>(): AuthClient<T> {
  const state: AuthState<T> = {
    status: 'unauthenticated',
    initialized: true,
    authenticated: false,
    user: null,
    loading: false,
    error: null,
  }
  return {
    getState: vi.fn((): AuthState<T> => state),
    isAuthenticated: vi.fn((): boolean => false),
    getUser: vi.fn((): T | null => null),
    setUser: vi.fn((_user: T | null): void => {}),
    getAccessToken: vi.fn((): string | null => null),
    setAccessToken: vi.fn((_token: string | null): void => {}),
    setSession: vi.fn((_session: AuthSessionSeed<T>): void => {}),
    getRefreshToken: vi.fn((): string | null => null),
    login: vi.fn((_credentials: LoginCredentials): Promise<AuthResult<T>> =>
      notImplemented('login'),
    ),
    logout: vi.fn((): Promise<void> => Promise.resolve()),
    register: vi.fn((_data: RegisterData): Promise<AuthResult<T>> => notImplemented('register')),
    refresh: vi.fn((): Promise<AuthResult<T>> => notImplemented('refresh')),
    requestPasswordReset: vi.fn((_data: PasswordResetRequest): Promise<void> => Promise.resolve()),
    confirmPasswordReset: vi.fn((_data: PasswordResetConfirm): Promise<void> => Promise.resolve()),
    updateProfile: vi.fn((_data: Partial<T>): Promise<T> => notImplemented('updateProfile')),
    changePassword: vi.fn((_oldPassword: string, _newPassword: string): Promise<void> =>
      Promise.resolve(),
    ),
    initialize: vi.fn((): Promise<void> => Promise.resolve()),
    subscribe: vi.fn((_callback: (state: AuthState<T>) => void): (() => void) => () => {}),
    onAuthChange: vi.fn((_callback: (state: AuthState<T>) => void): (() => void) => () => {}),
    addEventListener: vi.fn((_listener: AuthEventListener<T>): (() => void) => () => {}),
    destroy: vi.fn((): void => {}),
  }
}

/**
 * Creates a full {@link HttpClient} mock. Every request method rejects until a
 * test overrides it through `vi.mocked`.
 *
 * @returns A mock HTTP client that satisfies `HttpClient`.
 */
export function createTestHttpClient(): HttpClient {
  return {
    baseURL: 'https://api.example.com',
    defaultHeaders: {},
    // The request methods are generic over the response body; a bare `vi.fn`
    // mocks them without pinning a concrete body type.
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    addRequestInterceptor: vi.fn((_interceptor: RequestInterceptor): (() => void) => () => {}),
    addResponseInterceptor: vi.fn((_interceptor: ResponseInterceptor): (() => void) => () => {}),
    addErrorInterceptor: vi.fn((_interceptor: ErrorInterceptor): (() => void) => () => {}),
    setAuthToken: vi.fn((_token: string | null): void => {}),
    getAuthToken: vi.fn((): string | null => null),
    onAuthError: vi.fn<HttpClient['onAuthError']>(() => () => {}),
  }
}

/**
 * Builds a complete {@link HttpResponse} for a mock client to resolve with.
 *
 * @template T - The response body type.
 * @param data - The response body.
 * @param method - The request method the response answers.
 * @param url - The request URL the response answers.
 * @param status - The HTTP status code.
 * @returns A response object satisfying `HttpResponse<T>`.
 */
export function testHttpResponse<T>(
  data: T,
  method: HttpMethod,
  url: string,
  status = 200,
): HttpResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { method, url },
  }
}

/**
 * Creates a full {@link I18nProvider} mock backed by English and Arabic.
 *
 * @returns A mock i18n provider that satisfies `I18nProvider`.
 */
export function createTestI18nProvider(): I18nProvider {
  return {
    getLocale: vi.fn((): string => 'en'),
    setLocale: vi.fn((_locale: string): Promise<void> => Promise.resolve()),
    getLocales: vi.fn((): LocaleConfig[] => [
      { code: 'en', name: 'English' },
      { code: 'ar', name: 'Arabic' },
    ]),
    addLocale: vi.fn((_config: LocaleConfig): void => {}),
    removeLocale: vi.fn((_code: string): boolean => true),
    addTranslations: vi.fn(
      (_locale: string, _translations: Translations, _namespace?: string): void => {},
    ),
    t: vi.fn((key: string): string => `translated:${key}`),
    exists: vi.fn((_key: string): boolean => false),
    formatNumber: vi.fn((value: number, _options?: NumberFormatOptions): string => `${value}`),
    formatDate: vi.fn(
      (_value: Date | number | string, _options?: DateFormatOptions): string => 'formatted-date',
    ),
    formatRelativeTime: vi.fn((): string => 'formatted-relative-time'),
    formatList: vi.fn((_values: string[]): string => 'formatted-list'),
    onLocaleChange: vi.fn((_listener: (locale: string) => void): (() => void) => () => {}),
    getDirection: vi.fn((): 'ltr' | 'rtl' => 'ltr'),
  }
}

/**
 * Creates a full {@link Logger} mock whose methods are `vi.fn` mocks.
 *
 * @returns A mock logger that satisfies `Logger`.
 */
export function createTestLogger(): Logger {
  const logger: Logger = {
    trace: vi.fn((_message: string): void => {}),
    debug: vi.fn((_message: string): void => {}),
    info: vi.fn((_message: string): void => {}),
    warn: vi.fn((_message: string): void => {}),
    error: vi.fn((_message: string | Error): void => {}),
    setLevel: vi.fn((_level: LogLevel): void => {}),
    getLevel: vi.fn((): LogLevel => 'info'),
    child: vi.fn((): Logger => logger),
    withContext: vi.fn((): Logger => logger),
    addTransport: vi.fn((_transport: LogTransport): (() => void) => () => {}),
    removeTransport: vi.fn((_transport: LogTransport): void => {}),
  }
  return logger
}

/**
 * Creates a full {@link LoggerProvider} mock that hands back one logger.
 *
 * @param logger - The logger the provider creates and returns.
 * @returns A mock logger provider that satisfies `LoggerProvider`.
 */
export function createTestLoggerProvider(logger: Logger = createTestLogger()): LoggerProvider {
  return {
    getLogger: vi.fn((_name?: string): Logger => logger),
    createLogger: vi.fn((_nameOrConfig: string | LoggerConfig): Logger => logger),
    setLevel: vi.fn((_level: LogLevel): void => {}),
    getLevel: vi.fn((): LogLevel => 'info'),
    addTransport: vi.fn((_transport: LogTransport): (() => void) => () => {}),
    enable: vi.fn((): void => {}),
    disable: vi.fn((): void => {}),
    isEnabled: vi.fn((): boolean => true),
  }
}

/** The route params {@link createTestRouter} reports until a test replaces them. */
const EMPTY_ROUTE_PARAMS: RouteParams = {}

/**
 * Creates a full {@link Router} mock parked on `/`.
 *
 * @returns A mock router that satisfies `Router`.
 */
export function createTestRouter(): Router {
  return {
    getLocation: vi.fn((): RouteLocation => ({ pathname: '/', search: '', hash: '' })),
    // getParams is generic over its params type, which one fixture cannot
    // prove, and a `vi.fn` cannot carry a generic signature — so it stays a
    // plain generic arrow over the empty route params. matchPath returns
    // null: no route matches.
    getParams: <T extends RouteParams = RouteParams>(): T => EMPTY_ROUTE_PARAMS as T,
    getQuery: vi.fn((): QueryParams => ({})),
    getQueryParam: vi.fn((_key: string): string | undefined => undefined),
    getHash: vi.fn((): string => ''),
    navigate: vi.fn((_path: string, _options?: NavigateOptions): void => {}),
    navigateTo: vi.fn(
      (
        _name: string,
        _params?: RouteParams,
        _query?: QueryParams,
        _options?: NavigateOptions,
      ): void => {},
    ),
    back: vi.fn((): void => {}),
    forward: vi.fn((): void => {}),
    go: vi.fn((_delta: number): void => {}),
    setQuery: vi.fn((_params: QueryParams, _options?: NavigateOptions): void => {}),
    setQueryParam: vi.fn(
      (_key: string, _value: string | undefined, _options?: NavigateOptions): void => {},
    ),
    setHash: vi.fn((_hash: string, _options?: NavigateOptions): void => {}),
    isActive: vi.fn((_path: string, _exact?: boolean): boolean => false),
    matchPath: vi.fn((_pattern: string, _pathname: string): null => null),
    generatePath: vi.fn((_name: string): string => '/'),
    createHref: vi.fn((path: string): string => path),
    subscribe: vi.fn((_listener: RouteChangeListener): (() => void) => () => {}),
    addGuard: vi.fn((_guard: NavigationGuard): (() => void) => () => {}),
    registerRoutes: vi.fn((_routes: RouteDefinition[]): void => {}),
    getRoutes: vi.fn((): RouteDefinition[] => []),
    destroy: vi.fn((): void => {}),
  }
}

/**
 * Creates a {@link StateProvider} mock. `createStore` throws: the tests that
 * use this provider only pass it around and never create a store through it.
 * Use a local store mock (see state.service.test.ts) when a store is needed.
 *
 * @returns A mock state provider that satisfies `StateProvider`.
 */
export function createTestStateProvider(): StateProvider {
  return {
    // createStore is generic over the store body, which one fixture cannot
    // prove, and a `vi.fn` cannot carry a generic signature — so it stays a
    // plain generic arrow. No test in this package creates a store through it.
    createStore: <T>(): Store<T> => {
      throw new Error('createStore is not implemented by createTestStateProvider')
    },
  }
}

/**
 * Creates a full {@link StorageProvider} mock backed by an empty store.
 *
 * @returns A mock storage provider that satisfies `StorageProvider`.
 */
export function createTestStorageProvider(): StorageProvider {
  return {
    get: vi.fn((_key: string): Promise<null> => Promise.resolve(null)),
    set: vi.fn((_key: string, _value: unknown): Promise<void> => Promise.resolve()),
    remove: vi.fn((_key: string): Promise<void> => Promise.resolve()),
    clear: vi.fn((): Promise<void> => Promise.resolve()),
    keys: vi.fn((): Promise<string[]> => Promise.resolve([])),
  }
}

/** A neutral color palette for {@link createTestTheme}. */
const TEST_THEME_COLORS: ThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#f8f8f8',
  backgroundTertiary: '#f0f0f0',
  surface: '#ffffff',
  surfaceSecondary: '#f8f8f8',
  inputBackground: '#ffffff',
  text: '#111111',
  textSecondary: '#444444',
  textTertiary: '#777777',
  textInverse: '#eeeeee',
  primary: '#0066ff',
  primaryLight: '#4d94ff',
  primaryDark: '#0047b3',
  secondary: '#6600ff',
  secondaryLight: '#a34dff',
  secondaryDark: '#4700b3',
  success: '#00aa44',
  successLight: '#4dcc88',
  warning: '#ffaa00',
  warningLight: '#ffcc55',
  error: '#dd2211',
  errorLight: '#ff7766',
  info: '#0088cc',
  infoLight: '#55bbee',
  border: '#dddddd',
  borderSecondary: '#cccccc',
  borderFocus: '#0066ff',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.2)',
}

/**
 * Builds a complete {@link Theme} — the theme contract requires every scale,
 * so tests hand providers real, full theme objects.
 *
 * @param name - The theme name.
 * @param mode - The color mode the theme resolves to.
 * @param colors - Per-test color overrides on top of a neutral palette.
 * @returns A theme object satisfying `Theme`.
 */
export function createTestTheme(
  name: string,
  mode: 'light' | 'dark',
  colors: Partial<ThemeColors> = {},
): Theme {
  return {
    name,
    mode,
    colors: { ...TEST_THEME_COLORS, ...colors },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px',
      xxxl: '64px',
    },
    typography: {
      fontFamily: { sans: 'sans-serif', serif: 'serif', mono: 'monospace' },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
        '5xl': '48px',
      },
      fontWeight: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
    },
    borderRadius: { none: '0', sm: '2px', md: '4px', lg: '8px', xl: '16px', full: '9999px' },
    shadows: {
      none: 'none',
      sm: '0 1px 2px rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    },
    transitions: { fast: '150ms', normal: '250ms', slow: '400ms' },
    zIndex: {
      hide: -1,
      base: 0,
      dropdown: 1000,
      sticky: 1100,
      fixed: 1200,
      modal: 1300,
      popover: 1400,
      tooltip: 1500,
      toast: 1600,
    },
  }
}

/**
 * Creates a full {@link ThemeProvider} mock serving one theme.
 *
 * @param theme - The theme the provider reports as active.
 * @returns A mock theme provider that satisfies `ThemeProvider`.
 */
export function createTestThemeProvider(theme: Theme): ThemeProvider {
  return {
    getTheme: vi.fn((): Theme => theme),
    setTheme: vi.fn((_theme: Theme | string): void => {}),
    toggleMode: vi.fn((): void => {}),
    subscribe: vi.fn((_callback: (theme: Theme) => void): (() => void) => () => {}),
    getThemes: vi.fn((): Theme[] => [theme]),
  }
}
