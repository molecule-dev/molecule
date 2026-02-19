# @molecule/app-angular

Angular framework bindings for molecule.dev.

Provides Angular-specific services and providers for all molecule
core interfaces. This package enables the use of molecule's framework-agnostic
interfaces with Angular's idioms (services, DI, RxJS observables, etc.).

## Type
`framework`

## Installation
```bash
npm install @molecule/app-angular
```

## Usage

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser'
import { provideMolecule } from '@molecule/app-angular'
import { provider as stateProvider } from '@molecule/app-state-ngrx'

bootstrapApplication(AppComponent, {
  providers: [
    provideMolecule({
      state: stateProvider,
      auth: authClient,
      theme: themeProvider,
    }),
  ],
})

// component.ts
import { MoleculeAuthService, MoleculeThemeService } from '@molecule/app-angular'

## API

### Interfaces

#### `AsyncStateManager`

Async state manager.

```typescript
interface AsyncStateManager<T> {
  state$: Observable<T>
  getState: () => T
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
  destroy: () => void
}
```

#### `AuthClient`

Auth client interface that all auth bond packages must implement.
Provides login/logout/register flows, token management, profile
updates, and auth state subscription.

```typescript
interface AuthClient<T = UserProfile> {
    /**
     * Returns the current authentication state snapshot.
     */
    getState(): AuthState<T>;
    /**
     * Returns whether the user is currently authenticated.
     */
    isAuthenticated(): boolean;
    /**
     * Gets the current user.
     */
    getUser(): T | null;
    /**
     * Gets the current access token.
     */
    getAccessToken(): string | null;
    /**
     * Gets the refresh token.
     */
    getRefreshToken(): string | null;
    /**
     * Logs in with credentials.
     */
    login(credentials: LoginCredentials): Promise<AuthResult<T>>;
    /**
     * Logs out the current user.
     */
    logout(): Promise<void>;
    /**
     * Registers a new user.
     */
    register(data: RegisterData): Promise<AuthResult<T>>;
    /**
     * Refreshes the access token.
     */
    refresh(): Promise<AuthResult<T>>;
    /**
     * Requests a password reset.
     */
    requestPasswordReset(data: PasswordResetRequest): Promise<void>;
    /**
     * Confirms a password reset.
     */
    confirmPasswordReset(data: PasswordResetConfirm): Promise<void>;
    /**
     * Updates the current user's profile.
     */
    updateProfile(data: Partial<T>): Promise<T>;
    /**
     * Changes the current user's password.
     */
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
    /**
     * Initializes auth state (e.g., from stored tokens).
     */
    initialize(): Promise<void>;
    /**
     * Subscribes to auth state changes.
     */
    subscribe(callback: (state: AuthState<T>) => void): () => void;
    /**
     * Subscribes to auth state changes (alias for subscribe).
     */
    onAuthChange(callback: (state: AuthState<T>) => void): () => void;
    /**
     * Gets the current access token (alias for getAccessToken).
     */
    getToken?(): string | null;
    /**
     * Adds an auth event listener.
     */
    addEventListener(listener: AuthEventListener): () => void;
    /**
     * Destroys the auth client.
     */
    destroy(): void;
}
```

#### `AuthState`

Reactive authentication state snapshot (initialized, authenticated, user, loading, and error).

```typescript
interface AuthState<T = UserProfile> {
    /**
     * Whether auth state has been initialized.
     */
    initialized: boolean;
    /**
     * Whether the user is authenticated.
     */
    authenticated: boolean;
    /**
     * Current user (if authenticated).
     */
    user: T | null;
    /**
     * Whether an auth operation is in progress.
     */
    loading: boolean;
    /**
     * Last auth error (if any).
     */
    error: string | null;
}
```

#### `CapacitorAppManager`

Capacitor app manager interface.

```typescript
interface CapacitorAppManager {
  state$: Observable<CapacitorAppState>
  ready$: Observable<boolean>
  initialize: () => Promise<void>
  destroy: () => void
}
```

#### `ChangePasswordStateManager`

Change password state manager.

```typescript
interface ChangePasswordStateManager {
  state$: Observable<PromiseState<void>>
  getState: () => PromiseState<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
  destroy: () => void
}
```

#### `DeviceService`

Device service interface.

```typescript
interface DeviceService {
  deviceInfo: DeviceInfo
  screenInfo: ScreenInfo
  hardwareInfo: HardwareInfo
  featureSupport: FeatureSupport
  supports: (feature: keyof FeatureSupport) => boolean
  isOnline: () => boolean
  isStandalone: () => boolean
  language: string
  languages: string[]
}
```

#### `FormController`

Form controller interface.

All form providers must implement this interface.

```typescript
interface FormController<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Gets the current form state.
     */
    getState(): FormState<T>;
    /**
     * Gets the value of a specific field.
     */
    getValue(name: string): unknown;
    getValue<K extends keyof T>(name: K): T[K];
    /**
     * Gets all form values.
     */
    getValues(): T;
    /**
     * Sets the value of a specific field.
     */
    setValue(name: string, value: unknown, options?: {
        shouldValidate?: boolean;
        shouldDirty?: boolean;
        shouldTouch?: boolean;
    }): void;
    /**
     * Sets multiple values at once.
     */
    setValues(values: Partial<T>, options?: {
        shouldValidate?: boolean;
    }): void;
    /**
     * Gets the error for a specific field.
     */
    getError(name: string): string | undefined;
    /**
     * Sets the error for a specific field.
     */
    setError(name: string, error: string | undefined): void;
    /**
     * Clears the error for a specific field.
     */
    clearError<K extends keyof T>(name: K): void;
    /**
     * Clears all errors.
     */
    clearErrors(): void;
    /**
     * Gets the field state for a specific field.
     */
    getFieldState<K extends keyof T>(name: K): FieldState<T[K]>;
    /**
     * Registers a field for form management.
     */
    register(nameOrOptions: string | RegisterOptions, options?: RegisterOptions): FieldRegistration;
    /**
     * Unregisters a field.
     */
    unregister(name: string): void;
    /**
     * Validates a specific field.
     */
    validateField<K extends keyof T>(name: K): Promise<boolean>;
    /**
     * Validates all fields.
     */
    validate(): Promise<boolean>;
    /**
     * Resets the form to initial values.
     */
    reset(values?: Partial<T>): void;
    /**
     * Handles form submission.
     */
    handleSubmit(onSubmit: (values: T) => void | Promise<void>, onError?: (errors: Partial<Record<keyof T, string>>) => void): (event?: {
        preventDefault?: () => void;
    }) => Promise<void>;
    /**
     * Sets focus to a field.
     */
    setFocus(name: keyof T): void;
    /**
     * Subscribes to form state changes.
     */
    subscribe(callback: (state: FormState<T>) => void): () => void;
    /**
     * Destroys the form controller.
     */
    destroy(): void;
}
```

#### `FormOptions`

Form creation options.

```typescript
interface FormOptions<T extends Record<string, unknown>> {
    /**
     * Default values.
     */
    defaultValues?: Partial<T>;
    /**
     * Validation mode.
     */
    mode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all';
    /**
     * Revalidation mode.
     */
    reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
    /**
     * Whether to focus the first error field on submit.
     */
    shouldFocusError?: boolean;
    /**
     * Form-level validation function.
     */
    validate?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
}
```

#### `HttpClient`

HTTP client interface.

All HTTP providers must implement this interface.

```typescript
interface HttpClient {
    /**
     * Base URL for all requests.
     */
    baseURL: string;
    /**
     * Default headers for all requests.
     */
    defaultHeaders: Record<string, string>;
    /**
     * Makes a generic HTTP request.
     */
    request<T = unknown>(config: FullRequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a GET request.
     */
    get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a POST request.
     */
    post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a PUT request.
     */
    put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a PATCH request.
     */
    patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a DELETE request.
     */
    delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Adds a request interceptor.
     * Returns a function to remove the interceptor.
     */
    addRequestInterceptor(interceptor: RequestInterceptor): () => void;
    /**
     * Adds a response interceptor.
     * Returns a function to remove the interceptor.
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): () => void;
    /**
     * Adds an error interceptor.
     * Returns a function to remove the interceptor.
     */
    addErrorInterceptor(interceptor: ErrorInterceptor): () => void;
    /**
     * Sets the authorization token.
     */
    setAuthToken(token: string | null): void;
    /**
     * Returns the current authorization token, or `null` if not set.
     */
    getAuthToken(): string | null;
    /**
     * Registers a handler for authentication errors (401).
     *
     * @returns An unsubscribe function.
     */
    onAuthError(handler: () => void): () => void;
}
```

#### `HttpState`

State for HTTP requests.

```typescript
interface HttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}
```

#### `I18nProvider`

i18n provider interface.

All i18n providers must implement this interface.

```typescript
interface I18nProvider {
    /**
     * Gets the current locale.
     */
    getLocale(): string;
    /**
     * Sets the current locale.
     */
    setLocale(locale: string): Promise<void>;
    /**
     * Gets all available locales.
     */
    getLocales(): LocaleConfig[];
    /**
     * Adds a locale.
     */
    addLocale(config: LocaleConfig): void;
    /**
     * Adds translations to a locale.
     */
    addTranslations(locale: string, translations: Translations, namespace?: string): void;
    /**
     * Translates a key with optional interpolation values and pluralization.
     *
     * @returns The translated string, or the default value / key if not found.
     */
    t(key: string, values?: InterpolationValues, options?: {
        defaultValue?: string;
        count?: number;
    }): string;
    /**
     * Checks if a translation key exists in the current locale.
     *
     * @returns `true` if the key has a translation.
     */
    exists(key: string): boolean;
    /**
     * Formats a number according to the current locale.
     *
     * @returns The locale-formatted number string.
     */
    formatNumber(value: number, options?: NumberFormatOptions): string;
    /**
     * Formats a date according to the current locale.
     *
     * @returns The locale-formatted date string.
     */
    formatDate(value: Date | number | string, options?: DateFormatOptions): string;
    /**
     * Formats a relative time (e.g. "2 hours ago").
     *
     * @returns The locale-formatted relative time string.
     */
    formatRelativeTime(value: Date | number, options?: {
        unit?: Intl.RelativeTimeFormatUnit;
    }): string;
    /**
     * Formats a list (e.g. "A, B, and C").
     *
     * @returns The locale-formatted list string.
     */
    formatList(values: string[], options?: {
        type?: 'conjunction' | 'disjunction' | 'unit';
    }): string;
    /**
     * Subscribes to locale changes.
     *
     * @returns An unsubscribe function.
     */
    onLocaleChange(listener: (locale: string) => void): () => void;
    /**
     * Gets the text direction for the current locale.
     *
     * @returns `'ltr'` or `'rtl'`.
     */
    getDirection(): 'ltr' | 'rtl';
    /**
     * Checks if a translation key exists (alias for exists).
     */
    hasKey?(key: string): boolean;
    /**
     * Checks if the provider is ready.
     */
    isReady?(): boolean;
    /**
     * Registers a callback for when the provider is ready.
     */
    onReady?(callback: () => void): () => void;
    /**
     * Registers a lazily-loaded content module for automatic reload on locale changes.
     * All registered content is reloaded during `setLocale()` before listeners fire,
     * ensuring content is available on the first re-render with no flash.
     *
     * Idempotent: registering the same module name twice is a no-op.
     */
    registerContent?(module: string, loader: (locale: string) => Promise<void>): void;
}
```

#### `Logger`

Logger instance with leveled logging methods, child logger creation,
and transport management.

```typescript
interface Logger {
    /**
     * Logs a trace message.
     */
    trace(message: string, ...args: unknown[]): void;
    /**
     * Logs a debug message.
     */
    debug(message: string, ...args: unknown[]): void;
    /**
     * Logs an info message.
     */
    info(message: string, ...args: unknown[]): void;
    /**
     * Logs a warning message.
     */
    warn(message: string, ...args: unknown[]): void;
    /**
     * Logs an error message.
     */
    error(message: string | Error, ...args: unknown[]): void;
    /**
     * Sets the log level.
     */
    setLevel(level: LogLevel): void;
    /**
     * Gets the current log level.
     */
    getLevel(): LogLevel;
    /**
     * Creates a child logger with a namespace.
     */
    child(name: string, context?: Record<string, unknown>): Logger;
    /**
     * Adds additional context to the logger.
     */
    withContext(context: Record<string, unknown>): Logger;
    /**
     * Adds a transport.
     */
    addTransport(transport: LogTransport): () => void;
    /**
     * Removes a transport.
     */
    removeTransport(transport: LogTransport): void;
}
```

#### `LoggerProvider`

Logger provider interface that all logger bond packages must implement.
Creates and manages logger instances and global log configuration.

```typescript
interface LoggerProvider {
    /**
     * Gets a logger by name, or the root logger if no name given.
     */
    getLogger(name?: string): Logger;
    /**
     * Creates a named logger.
     */
    createLogger(nameOrConfig: string | LoggerConfig, config?: LoggerConfig): Logger;
    /**
     * Sets the global log level.
     */
    setLevel(level: LogLevel): void;
    /**
     * Gets the global log level.
     */
    getLevel(): LogLevel;
    /**
     * Adds a global transport.
     */
    addTransport(transport: LogTransport): () => void;
    /**
     * Enables logging.
     */
    enable(): void;
    /**
     * Disables logging.
     */
    disable(): void;
    /**
     * Checks if logging is enabled.
     *
     * @returns `true` if logging is currently enabled.
     */
    isEnabled(): boolean;
}
```

#### `LoginStateManager`

Login state manager.

```typescript
interface LoginStateManager<T = unknown> {
  state$: Observable<PromiseState<AuthResult<T>>>
  getState: () => PromiseState<AuthResult<T>>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
  destroy: () => void
}
```

#### `MoleculeModuleConfig`

Configuration for molecule Angular module.

```typescript
interface MoleculeModuleConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
}
```

#### `MoleculeTokens`

Injection tokens for molecule services.

```typescript
interface MoleculeTokens {
  STATE_PROVIDER: symbol
  AUTH_CLIENT: symbol
  THEME_PROVIDER: symbol
  ROUTER: symbol
  I18N_PROVIDER: symbol
  HTTP_CLIENT: symbol
  STORAGE_PROVIDER: symbol
  LOGGER_PROVIDER: symbol
}
```

#### `OAuthOptions`

OAuth configuration options.

```typescript
interface OAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}
```

#### `OAuthStateManager`

OAuth state manager.

```typescript
interface OAuthStateManager {
  providers$: Observable<string[]>
  getProviders: () => string[]
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
  destroy: () => void
}
```

#### `PasswordResetStateManager`

Password reset state manager.

```typescript
interface PasswordResetStateManager {
  requestState$: Observable<PromiseState<void>>
  confirmState$: Observable<PromiseState<void>>
  getRequestState: () => PromiseState<void>
  getConfirmState: () => PromiseState<void>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
  destroy: () => void
}
```

#### `PlatformService`

Platform service interface.

```typescript
interface PlatformService {
  platform: Platform
  isNative: boolean
  isMobile: boolean
  isDesktop: boolean
  isWeb: boolean
  isDevelopment: boolean
  isProduction: boolean
  isPlatform: (...platforms: Platform[]) => boolean
}
```

#### `PromiseStateManager`

Promise state manager.

```typescript
interface PromiseStateManager<T> {
  state$: Observable<PromiseState<T>>
  getState: () => PromiseState<T>
  call: (...args: any[]) => Promise<T>
  cancel: (message?: string) => void
  reset: () => void
  destroy: () => void
}
```

#### `PushService`

Push service interface.

```typescript
interface PushService {
  permission$: Observable<PermissionStatus | null>
  token$: Observable<PushToken | null>
  getPermission: () => PermissionStatus | null
  getToken: () => PushToken | null
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
  register: () => Promise<PushToken>
  unregister: () => Promise<void>
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  onNotificationAction: (listener: NotificationActionListener) => () => void
  onTokenChange: (listener: TokenChangeListener) => () => void
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
  destroy: () => void
}
```

#### `RouteLocation`

Current URL decomposed into pathname, search string, hash, navigation state, and unique key.

```typescript
interface RouteLocation {
    /**
     * Current pathname.
     */
    pathname: string;
    /**
     * Query string (including leading ?).
     */
    search: string;
    /**
     * Hash (including leading #).
     */
    hash: string;
    /**
     * State data passed with navigation.
     */
    state?: unknown;
    /**
     * Unique key for this location.
     */
    key?: string;
}
```

#### `Router`

Client-side router providing navigation, guards, route matching, and history control.

All routing providers must implement this interface.

```typescript
interface Router {
    /**
     * Returns the current route location (pathname, search, hash, state).
     */
    getLocation(): RouteLocation;
    /**
     * Gets the current route params.
     */
    getParams<T extends RouteParams = RouteParams>(): T;
    /**
     * Gets the current query params.
     */
    getQuery(): QueryParams;
    /**
     * Gets a specific query parameter.
     */
    getQueryParam(key: string): string | undefined;
    /**
     * Gets the current hash.
     */
    getHash(): string;
    /**
     * Navigates to a path.
     */
    navigate(path: string, options?: NavigateOptions): void;
    /**
     * Navigates to a named route.
     */
    navigateTo(name: string, params?: RouteParams, query?: QueryParams, options?: NavigateOptions): void;
    /**
     * Goes back in history.
     */
    back(): void;
    /**
     * Goes forward in history.
     */
    forward(): void;
    /**
     * Goes to a specific point in history.
     */
    go(delta: number): void;
    /**
     * Updates the current query params.
     */
    setQuery(params: QueryParams, options?: NavigateOptions): void;
    /**
     * Updates a specific query parameter.
     */
    setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void;
    /**
     * Updates the current hash.
     */
    setHash(hash: string, options?: NavigateOptions): void;
    /**
     * Checks if a path matches the current location.
     *
     * @returns `true` if the path matches the current route.
     */
    isActive(path: string, exact?: boolean): boolean;
    /**
     * Matches a path pattern against a pathname.
     */
    matchPath<Params extends RouteParams = RouteParams>(pattern: string, pathname: string): RouteMatch<Params> | null;
    /**
     * Generates a URL from a named route.
     */
    generatePath(name: string, params?: RouteParams, query?: QueryParams): string;
    /**
     * Subscribes to route changes.
     */
    subscribe(listener: RouteChangeListener): () => void;
    /**
     * Adds a navigation guard.
     */
    addGuard(guard: NavigationGuard): () => void;
    /**
     * Registers route definitions.
     */
    registerRoutes(routes: RouteDefinition[]): void;
    /**
     * Gets all registered routes.
     */
    getRoutes(): RouteDefinition[];
    /**
     * Destroys the router.
     */
    destroy(): void;
}
```

#### `SignupStateManager`

Signup state manager.

```typescript
interface SignupStateManager<T = unknown> {
  state$: Observable<PromiseState<AuthResult<T>>>
  getState: () => PromiseState<AuthResult<T>>
  signup: (data: RegisterData) => Promise<AuthResult<T>>
  reset: () => void
  destroy: () => void
}
```

#### `StateProvider`

State provider interface that all state management bond packages
must implement. Provides the store creation factory.

```typescript
interface StateProvider {
    /**
     * Creates a new store.
     */
    createStore<T>(config: StoreConfig<T>): Store<T>;
}
```

#### `StorageProvider`

Storage provider interface.

All storage providers must implement this interface.

```typescript
interface StorageProvider {
    /**
     * Gets a value from storage.
     */
    get<T = unknown>(key: string): Promise<T | null>;
    /**
     * Sets a value in storage.
     */
    set<T = unknown>(key: string, value: T): Promise<void>;
    /**
     * Removes a value from storage.
     */
    remove(key: string): Promise<void>;
    /**
     * Clears all values from storage.
     */
    clear(): Promise<void>;
    /**
     * Gets all keys in storage.
     */
    keys(): Promise<string[]>;
    /**
     * Gets multiple values from storage.
     */
    getMany?<T = unknown>(keys: string[]): Promise<Map<string, T | null>>;
    /**
     * Sets multiple values in storage.
     */
    setMany?<T = unknown>(entries: Array<[string, T]>): Promise<void>;
    /**
     * Removes multiple values from storage.
     */
    removeMany?(keys: string[]): Promise<void>;
}
```

#### `StorageValueState`

State for a storage value.

```typescript
interface StorageValueState<T> {
  value: T | undefined
  loading: boolean
  error: Error | null
}
```

#### `Store`

Reactive state container with getState, setState, subscribe, and destroy.

All state management providers must implement this interface.

```typescript
interface Store<T> {
    /**
     * Gets the current state.
     */
    getState(): T;
    /**
     * Sets the state (partial or via updater function).
     */
    setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
    /**
     * Subscribes to state changes.
     * Returns an unsubscribe function.
     */
    subscribe(listener: StateListener<T>): () => void;
    /**
     * Destroys the store and cleans up subscriptions.
     */
    destroy(): void;
}
```

#### `StoreConfig`

Configuration for creating a store (initial state, optional name, and middleware chain).

```typescript
interface StoreConfig<T> {
    /**
     * Initial state value.
     */
    initialState: T;
    /**
     * Optional name for debugging.
     */
    name?: string;
    /**
     * Optional middleware functions.
     */
    middleware?: StoreMiddleware<T>[];
}
```

#### `Theme`

Complete theme definition.

```typescript
interface Theme {
    name: string;
    mode: 'light' | 'dark';
    colors: ThemeColors;
    breakpoints: ThemeBreakpoints;
    spacing: ThemeSpacing;
    typography: ThemeTypography;
    borderRadius: ThemeBorderRadius;
    shadows: ThemeShadows;
    transitions: ThemeTransitions;
    zIndex: ThemeZIndex;
}
```

#### `ThemeProvider`

Manages theme state including the active theme, mode toggling,
and change subscriptions.

```typescript
interface ThemeProvider {
    /**
     * Returns the currently active theme.
     */
    getTheme(): Theme;
    /**
     * Sets the active theme by reference or by name.
     *
     * @param theme - A `Theme` object or a theme name string to activate.
     */
    setTheme(theme: Theme | string): void;
    /**
     * Toggles between light and dark mode for the active theme.
     */
    toggleMode(): void;
    /**
     * Subscribes to theme changes. The callback fires whenever
     * `setTheme()` or `toggleMode()` is called.
     *
     * @param callback - Invoked with the new theme after each change.
     * @returns An unsubscribe function.
     */
    subscribe(callback: (theme: Theme) => void): () => void;
    /**
     * Returns all registered themes. Optional — not all providers
     * support multiple themes.
     */
    getThemes?(): Theme[];
}
```

#### `VersionService`

Version service interface.

```typescript
interface VersionService {
  state$: Observable<VersionState>
  isUpdateAvailable$: Observable<boolean>
  isChecking$: Observable<boolean>
  isServiceWorkerWaiting$: Observable<boolean>
  newVersion$: Observable<string | undefined>
  getState: () => VersionState
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
  destroy: () => void
}
```

### Types

#### `QueryParams`

URL query string parameter map (single values or arrays for repeated keys).

```typescript
type QueryParams = Record<string, string | string[] | undefined>;
```

#### `RouteParams`

URL path parameter key-value map extracted from dynamic route segments (e.g. `{ id: '123' }`).

```typescript
type RouteParams = Record<string, string>;
```

### Classes

#### `MoleculeAuthService`

Angular service for authentication.

Wraps molecule auth client and exposes state as RxJS observables.

#### `MoleculeFormInstance`

Wrapper around a FormController that provides RxJS observables and
synchronous accessors for use in Angular components.

#### `MoleculeFormsService`

Angular service for form handling.

Wraps molecule form providers and creates form instances that expose
state as RxJS observables.

#### `MoleculeHttpService`

Angular service for HTTP requests.

Wraps molecule HTTP client and returns RxJS observables.

#### `MoleculeI18nService`

Angular service for internationalization.

Wraps molecule i18n provider and exposes state as RxJS observables.

#### `MoleculeLoggerService`

Angular service for logging.

Wraps molecule logger provider.

#### `MoleculeRouterService`

Angular service for routing.

Wraps molecule router and exposes state as RxJS observables.

#### `MoleculeStateService`

Angular service for state management.

Wraps molecule state stores and exposes them as RxJS observables.

#### `MoleculeStorageService`

Angular service for storage.

Wraps molecule storage provider and returns RxJS observables.

#### `MoleculeThemeService`

Angular service for theming.

Wraps molecule theme provider and exposes state as RxJS observables.

### Functions

#### `createAsyncState(initialState)`

Creates an async-capable state manager.

```typescript
function createAsyncState(initialState: T): AsyncStateManager<T>
```

- `initialState` — Initial state value

**Returns:** The created instance.

#### `createCapacitorAppState(options)`

Creates an Angular Capacitor app service with reactive state.

Wraps `createCapacitorApp` from `@molecule/app-platform` and exposes
state changes as RxJS observables.

```typescript
function createCapacitorAppState(options?: CapacitorAppOptions): CapacitorAppManager
```

- `options` — Capacitor app configuration options

**Returns:** Capacitor app manager with observables and action methods

#### `createChangePasswordState(client)`

Creates a change password state manager with async state tracking.

```typescript
function createChangePasswordState(client: AuthClient<UserProfile>): ChangePasswordStateManager
```

- `client` — Auth client

**Returns:** Change password state manager

#### `createDeviceService()`

Creates an Angular device service with static device information.

```typescript
function createDeviceService(): DeviceService
```

**Returns:** Device service with device, screen, hardware, and feature info

#### `createLoginState(client)`

Creates a login state manager with async state tracking.

```typescript
function createLoginState(client: AuthClient<T>): LoginStateManager<T>
```

- `client` — Auth client

**Returns:** Login state manager

#### `createOAuthState(options)`

Creates an OAuth state manager.

```typescript
function createOAuthState(options?: OAuthOptions): OAuthStateManager
```

- `options` — OAuth configuration

**Returns:** The created instance.

#### `createPasswordResetState(client)`

Creates a password reset state manager with async state tracking.

```typescript
function createPasswordResetState(client: AuthClient<UserProfile>): PasswordResetStateManager
```

- `client` — Auth client

**Returns:** Password reset state manager

#### `createPlatformService()`

Creates an Angular platform service with static platform information.

```typescript
function createPlatformService(): PlatformService
```

**Returns:** Platform service with platform flags and isPlatform check

#### `createPromiseState(asyncFn)`

Creates a promise state manager for tracking async function state.

```typescript
function createPromiseState(asyncFn: T): PromiseStateManager<Awaited<ReturnType<T>>>
```

- `asyncFn` — The async function to track

**Returns:** Promise state manager with observable state

#### `createPushService()`

Creates an Angular push notifications service with reactive state.

```typescript
function createPushService(): PushService
```

**Returns:** Push service with observables and action methods

#### `createSignupState(client)`

Creates a signup state manager with async state tracking.

```typescript
function createSignupState(client: AuthClient<T>): SignupStateManager<T>
```

- `client` — Auth client

**Returns:** Signup state manager

#### `createVersionService()`

Creates an Angular version service with reactive state.

```typescript
function createVersionService(): VersionService
```

**Returns:** The created instance.

#### `provideAuth(client)`

Registers an AuthClient as an Angular environment provider for dependency injection.

```typescript
function provideAuth(client: AuthClient<T>): EnvironmentProviders
```

- `client` — Auth client

**Returns:** Environment providers

#### `provideHttp(client)`

Provide HTTP client.

```typescript
function provideHttp(client: HttpClient): EnvironmentProviders
```

- `client` — HTTP client

**Returns:** Environment providers

#### `provideI18n(provider)`

Registers an I18nProvider as an Angular environment provider for dependency injection.

```typescript
function provideI18n(provider: I18nProvider): EnvironmentProviders
```

- `provider` — I18n provider

**Returns:** Environment providers

#### `provideLogger(provider)`

Registers a LoggerProvider as an Angular environment provider for dependency injection.

```typescript
function provideLogger(provider: LoggerProvider): EnvironmentProviders
```

- `provider` — Logger provider

**Returns:** Environment providers

#### `provideMolecule(config)`

Provide all molecule services at once.

```typescript
function provideMolecule(config: MoleculeModuleConfig): EnvironmentProviders
```

- `config` — Configuration with all providers

**Returns:** Environment providers

#### `provideRouter(router)`

Registers a Router as an Angular environment provider for dependency injection.

```typescript
function provideRouter(router: Router): EnvironmentProviders
```

- `router` — Router instance

**Returns:** Environment providers

#### `provideState(provider)`

Provide state management.

```typescript
function provideState(provider: StateProvider): EnvironmentProviders
```

- `provider` — State provider

**Returns:** Environment providers

#### `provideStorage(provider)`

Registers a StorageProvider as an Angular environment provider for dependency injection.

```typescript
function provideStorage(provider: StorageProvider): EnvironmentProviders
```

- `provider` — Storage provider

**Returns:** Environment providers

#### `provideTheme(provider)`

Registers a ThemeProvider as an Angular environment provider for dependency injection.

```typescript
function provideTheme(provider: ThemeProvider): EnvironmentProviders
```

- `provider` — Theme provider

**Returns:** Environment providers

### Constants

#### `AUTH_CLIENT`

Injection token for auth client.

```typescript
const AUTH_CLIENT: InjectionToken<AuthClient<unknown>>
```

#### `HTTP_CLIENT`

Injection token for HTTP client.

```typescript
const HTTP_CLIENT: InjectionToken<HttpClient>
```

#### `I18N_PROVIDER`

Injection token for i18n provider.

```typescript
const I18N_PROVIDER: InjectionToken<I18nProvider>
```

#### `LOGGER_PROVIDER`

Injection token for logger provider.

```typescript
const LOGGER_PROVIDER: InjectionToken<LoggerProvider>
```

#### `ROUTER`

Injection token for router.

```typescript
const ROUTER: InjectionToken<Router>
```

#### `STATE_PROVIDER`

Injection token for state provider.

```typescript
const STATE_PROVIDER: InjectionToken<StateProvider>
```

#### `STORAGE_PROVIDER`

Injection token for storage provider.

```typescript
const STORAGE_PROVIDER: InjectionToken<StorageProvider>
```

#### `THEME_PROVIDER`

Injection token for theme provider.

```typescript
const THEME_PROVIDER: InjectionToken<ThemeProvider>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@angular/core` ^18.0.0 || ^19.0.0 || ^20.0.0 || ^21.0.0
- `@molecule/app-auth` ^1.0.0
- `@molecule/app-device` ^1.0.0
- `@molecule/app-forms` ^1.0.0
- `@molecule/app-http` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-platform` ^1.0.0
- `@molecule/app-push` ^1.0.0
- `@molecule/app-routing` ^1.0.0
- `@molecule/app-state` ^1.0.0
- `@molecule/app-storage` ^1.0.0
- `@molecule/app-theme` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-utilities` ^1.0.0
- `@molecule/app-version` ^1.0.0
- `rxjs` ^7.8.0
