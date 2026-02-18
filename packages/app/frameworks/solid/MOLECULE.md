# @molecule/app-solid

Solid.js framework bindings for molecule.dev.

This package provides Solid.js-specific implementations of molecule.dev
core interfaces, using Solid's reactive primitives (signals, effects, resources).

## Type
`framework`

## Installation
```bash
npm install @molecule/app-solid
```

## Usage

```tsx
import { MoleculeProvider, createAuth, createTheme, createRouter } from '@molecule/app-solid'
import { createZustandProvider } from '@molecule/app-state-zustand'
import { createJwtAuthClient } from '@molecule/app-auth-jwt'

function App() {
  return (
    <MoleculeProvider
      config={{
        state: createZustandProvider(),
        auth: createJwtAuthClient({ baseUrl: '/api' }),
      }}
    >
      <Router />
    </MoleculeProvider>
  )
}

function UserProfile() {
  const { user, isAuthenticated, logout } = createAuth()
  const { theme, toggleTheme } = createTheme()
  const { navigate } = createRouter()

  return (
    <Show when={isAuthenticated()} fallback={<LoginRedirect />}>
      <div style={{ background: theme().colors.background }}>
        <h1>Welcome, {user()?.name}</h1>
        <button onClick={toggleTheme}>Toggle Theme</button>
        <button onClick={logout}>Logout</button>
      </div>
    </Show>
  )
}
```

## API

### Interfaces

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

#### `AuthPrimitives`

Auth primitives return type.

```typescript
interface AuthPrimitives<T = unknown> {
  state: Accessor<AuthState<T>>
  user: Accessor<T | null>
  isAuthenticated: Accessor<boolean>
  isLoading: Accessor<boolean>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T>['register']
  refresh: AuthClient<T>['refresh']
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

#### `CapacitorAppPrimitives`

Capacitor app primitives return type.

```typescript
interface CapacitorAppPrimitives {
  state: Accessor<CapacitorAppState>
  ready: Accessor<boolean>
  initialize: () => Promise<void>
}
```

#### `CreateAsyncStateReturn`

Return type for createAsyncState.

```typescript
interface CreateAsyncStateReturn<T> {
  state: () => T
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
}
```

#### `CreateChangePasswordReturn`

Return type for createChangePassword primitive.

```typescript
interface CreateChangePasswordReturn {
  state: Accessor<PromiseState<void>>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
}
```

#### `CreateFormResult`

Result of createForm primitive.

```typescript
interface CreateFormResult<T extends Record<string, unknown>> {
  /** Reactive form state accessor. */
  formState: Accessor<FormState<T>>

  /** Whether the form is currently valid. */
  isValid: Accessor<boolean>

  /** Whether any field has been modified. */
  isDirty: Accessor<boolean>

  /** Whether the form is currently submitting. */
  isSubmitting: Accessor<boolean>

  /** Current field errors. */
  errors: Accessor<Partial<Record<keyof T, string>>>

  /** Register a field for form management. */
  register: (name: keyof T, options?: RegisterOptions) => FieldRegistration

  /** Get the current value of a field. */
  getValue: <K extends keyof T>(name: K) => T[K]

  /** Set the value of a field. */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void

  /** Get the error message for a field. */
  getError: (name: keyof T) => string | undefined

  /** Set an error message for a field. */
  setError: (name: keyof T, error: string | undefined) => void

  /** Clear all field errors. */
  clearErrors: () => void

  /** Create a submit handler function. */
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>

  /** Reset the form to initial or provided values. */
  reset: (values?: Partial<T>) => void

  /** Validate all fields. */
  validate: () => Promise<boolean>

  /** The raw FormController instance for advanced use. */
  controller: FormController<T>
}
```

#### `CreateLoginReturn`

Return type for createLogin primitive.

```typescript
interface CreateLoginReturn<T = unknown> {
  state: Accessor<PromiseState<AuthResult<T>>>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
}
```

#### `CreateOAuthOptions`

OAuth configuration options.

```typescript
interface CreateOAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}
```

#### `CreateOAuthReturn`

Return type for createOAuth primitive.

```typescript
interface CreateOAuthReturn {
  providers: Accessor<string[]>
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
}
```

#### `CreatePasswordResetReturn`

Return type for createPasswordReset primitive.

```typescript
interface CreatePasswordResetReturn {
  requestState: Accessor<PromiseState<void>>
  confirmState: Accessor<PromiseState<void>>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
}
```

#### `CreatePromiseReturn`

Promise state accessor with actions.

```typescript
interface CreatePromiseReturn<T> {
  state: () => PromiseState<T>
  call: (...args: any[]) => Promise<T>
  cancel: (message?: string) => void
  reset: () => void
}
```

#### `CreateSignupReturn`

Return type for createSignup primitive.

```typescript
interface CreateSignupReturn<T = unknown> {
  state: Accessor<PromiseState<AuthResult<T>>>
  signup: (data: RegisterData) => Promise<AuthResult<T>>
  reset: () => void
}
```

#### `DevicePrimitives`

Device primitives return type.

```typescript
interface DevicePrimitives {
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

State for async HTTP operations.

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

#### `MoleculeConfig`

Configuration for molecule Solid context.

```typescript
interface MoleculeConfig {
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

#### `MoleculeStore`

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

#### `PlatformPrimitives`

Platform primitives return type.

```typescript
interface PlatformPrimitives {
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

#### `PushPrimitives`

Push primitives return type.

```typescript
interface PushPrimitives {
  permission: Accessor<PermissionStatus | null>
  token: Accessor<PushToken | null>
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
  register: () => Promise<PushToken>
  unregister: () => Promise<void>
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  onNotificationAction: (listener: NotificationActionListener) => () => void
  onTokenChange: (listener: TokenChangeListener) => () => void
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
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

#### `RouterPrimitives`

Router primitives return type.

```typescript
interface RouterPrimitives {
  location: Accessor<RouteLocation>
  params: Accessor<RouteParams>
  query: Accessor<QueryParams>
  navigate: Router['navigate']
  navigateTo: Router['navigateTo']
  back: Router['back']
  forward: Router['forward']
  isActive: Router['isActive']
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

State for async storage values.

```typescript
interface StorageValueState<T> {
  value: T | undefined
  loading: boolean
  error: Error | null
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

#### `ThemePrimitives`

Theme primitives return type.

```typescript
interface ThemePrimitives {
  theme: Accessor<Theme>
  themeName: Accessor<string>
  mode: Accessor<'light' | 'dark'>
  setTheme: (name: string) => void
  toggleTheme: () => void
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

#### `VersionPrimitives`

Version primitives return type.

```typescript
interface VersionPrimitives {
  state: Accessor<VersionState>
  isUpdateAvailable: Accessor<boolean>
  isChecking: Accessor<boolean>
  isServiceWorkerWaiting: Accessor<boolean>
  newVersion: Accessor<string | undefined>
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
}
```

### Types

#### `Accessor`

```typescript
type Accessor<T> = () => T;
```

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

#### `Setter`

```typescript
type Setter<in out T> = {
    <U extends T>(...args: undefined extends T ? [] : [value: Exclude<U, Function> | ((prev: T) => U)]): undefined extends T ? undefined : U;
    <U extends T>(value: (prev: T) => U): U;
    <U extends T>(value: Exclude<U, Function>): U;
    <U extends T>(value: Exclude<U, Function> | ((prev: T) => U)): U;
};
```

### Functions

#### `applyThemeToDocument()`

Apply theme CSS variables to document.

```typescript
function applyThemeToDocument(): void
```

#### `createAsyncState(initialState)`

Primitive like createSignal but accepts Promises and supports partial state extension.

```typescript
function createAsyncState(initialState: T): CreateAsyncStateReturn<T>
```

- `initialState` — Initial state value

**Returns:** The created instance.

#### `createAuth()`

Create auth primitives for authentication state and actions.

```typescript
function createAuth(): AuthPrimitives<T>
```

**Returns:** Auth primitives object

#### `createAuthFromClient(client)`

Create auth primitives from a specific client.

```typescript
function createAuthFromClient(client: AuthClient<T>): AuthPrimitives<T>
```

- `client` — Auth client

**Returns:** Auth primitives

#### `createAuthGuard(redirectTo)`

Create a guard primitive that redirects unauthenticated users.

```typescript
function createAuthGuard(redirectTo: string): Accessor<boolean>
```

- `redirectTo` — Path to redirect to

**Returns:** Accessor indicating if user is allowed

#### `createAuthHelpers()`

Creates a auth helpers.

```typescript
function createAuthHelpers(): { login: (credentials: LoginCredentials) => Promise<void>; logout: () => Promise<void>; register: (data: RegisterData) => Promise<void>; refresh: () => Promise<void>; getUser: () => T | null; getToken: () => string | null; isAuthenticated: () => boolean; }
```

**Returns:** The created result.

#### `createCapacitorApp(options)`

Create Capacitor app primitives for native app initialization.

Wraps the core `createCapacitorApp` coordinator with Solid signals,
automatically initializing and cleaning up on disposal.

```typescript
function createCapacitorApp(options?: CapacitorAppOptions): CapacitorAppPrimitives
```

- `options` — Capacitor app configuration options.

**Returns:** Capacitor app primitives object

#### `createChangePassword()`

Creates a change password primitive with async state tracking.

```typescript
function createChangePassword(): CreateChangePasswordReturn
```

**Returns:** Change password state and action

#### `createDevice()`

Create device primitives for accessing device information.

This is a static primitive (no reactive signals) since device info
does not change during the lifecycle of the app.

```typescript
function createDevice(): DevicePrimitives
```

**Returns:** Device primitives object

#### `createFieldSignal(controller, name)`

Create a reactive accessor for a single field's state.

```typescript
function createFieldSignal(controller: FormController<T>, name: keyof T): Accessor<FieldState<T[keyof T]>>
```

- `controller` — Form controller
- `name` — Field name to track

**Returns:** Accessor for the field state

#### `createForm(provider, options)`

Create form primitives for form state management and validation.

```typescript
function createForm(provider: FormProvider, options: FormOptions<T>): CreateFormResult<T>
```

- `provider` — Form provider that creates controllers
- `options` — Form configuration options

**Returns:** Form primitives object

#### `createFormFromController(controller)`

Create form primitives from an existing controller.

Useful when you have a controller created externally and want to
wrap it with Solid reactivity.

```typescript
function createFormFromController(controller: FormController<T>): CreateFormResult<T>
```

- `controller` — An existing FormController

**Returns:** Form primitives object

#### `createFormHelpers(provider)`

Creates a form helpers.

```typescript
function createFormHelpers(provider: FormProvider): { createForm: <T extends Record<string, unknown>>(options: FormOptions<T>) => CreateFormResult<T>; }
```

- `provider` — The provider implementation.

**Returns:** The created result.

#### `createHttp()`

Creates a http.

```typescript
function createHttp(): { get: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>; post: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; put: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; patch: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; delete: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>; request: <T>(config: FullRequestConfig) => Promise<HttpResponse<T>>; }
```

**Returns:** The created result.

#### `createHttpFromClient(client)`

Creates a http from client.

```typescript
function createHttpFromClient(client: HttpClient): { get: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>; post: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; put: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; patch: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; delete: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>; request: <T>(config: FullRequestConfig) => Promise<HttpResponse<T>>; }
```

- `client` — The client instance.

**Returns:** The created result.

#### `createHttpHelpers()`

Creates a http helpers.

```typescript
function createHttpHelpers(): { get: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>; post: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; put: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; patch: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>; delete: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>; setAuthToken: (token: string | null) => void; getAuthToken: () => string | null; }
```

**Returns:** The created result.

#### `createI18n()`

Creates a i18n.

```typescript
function createI18n(): { t: TranslateFunction; locale: Accessor<string>; setLocale: (newLocale: string) => Promise<void>; isReady: Accessor<boolean>; getLocales: () => string[]; hasKey: (key: string) => boolean; }
```

**Returns:** The created result.

#### `createI18nFromProvider(provider)`

Creates a i18n from provider.

```typescript
function createI18nFromProvider(provider: I18nProvider): { t: TranslateFunction; locale: Accessor<string>; setLocale: (newLocale: string) => Promise<void>; isReady: Accessor<boolean>; getLocales: () => string[]; hasKey: (key: string) => boolean; }
```

- `provider` — The provider implementation.

**Returns:** The created result.

#### `createI18nHelpers()`

Creates a i18n helpers.

```typescript
function createI18nHelpers(): { t: TranslateFunction; getLocale: () => string; setLocale: (locale: string) => Promise<void>; getLocales: () => string[]; hasKey: (key: string) => boolean; isReady: () => boolean; }
```

**Returns:** The created result.

#### `createIsActive(path, exact)`

Create a reactive boolean accessor that tracks whether a given path is active.

Unlike `useMatch` which only accepts a static pattern, this factory returns
a signal that re-evaluates on every route change and supports the `exact`
parameter from the router's `isActive` method.

```typescript
function createIsActive(path: string, exact?: boolean): Accessor<boolean>
```

- `path` — Path to check against the current location
- `exact` — Whether to require an exact match (default: false)

**Returns:** Accessor<boolean> that is true when the path is active

#### `createLogger(config)`

Create a logger with custom configuration.

```typescript
function createLogger(config: LoggerConfig): Logger
```

- `config` — Logger configuration

**Returns:** Logger instance

#### `createLoggerFromProvider(provider, name)`

Create logger from a specific provider.

```typescript
function createLoggerFromProvider(provider: LoggerProvider, name?: string): Logger
```

- `provider` — Logger provider
- `name` — Logger name

**Returns:** Logger instance

#### `createLoggerHelpers()`

Creates a logger helpers.

```typescript
function createLoggerHelpers(): { getLogger: (name?: string) => Logger; createLogger: (config: LoggerConfig) => Logger; setLevel: (level: "trace" | "debug" | "info" | "warn" | "error" | "silent") => void; getLevel: () => string; enable: () => void; disable: () => void; isEnabled: () => boolean; }
```

**Returns:** The created result.

#### `createLoggerHelpersFromProvider(provider)`

Creates a logger helpers from provider.

```typescript
function createLoggerHelpersFromProvider(provider: LoggerProvider): { getLogger: (name?: string) => Logger; createLogger: (config: LoggerConfig) => Logger; setLevel: (level: "trace" | "debug" | "info" | "warn" | "error" | "silent") => void; getLevel: () => string; enable: () => void; disable: () => void; isEnabled: () => boolean; }
```

- `provider` — The provider implementation.

**Returns:** The created result.

#### `createLogin()`

Creates a login primitive with async state tracking.

```typescript
function createLogin(): CreateLoginReturn<T>
```

**Returns:** Login state and action

#### `createOAuth(options)`

Creates OAuth helpers.

```typescript
function createOAuth(options?: CreateOAuthOptions): CreateOAuthReturn
```

- `options` — OAuth configuration

**Returns:** The created instance.

#### `createPasswordReset()`

Creates a password reset primitive with async state tracking.

```typescript
function createPasswordReset(): CreatePasswordResetReturn
```

**Returns:** Password reset state and actions

#### `createPersistedStore(key, initial, storage)`

Create a persisted signal store.

```typescript
function createPersistedStore(key: string, initial: T, storage: StorageAdapter): [Accessor<T>, (value: T | ((prev: T) => T)) => void]
```

- `key` — Storage key
- `initial` — Initial value
- `storage` — Storage adapter (required - use localStorage, sessionStorage, or `@molecule/app-storage`)

**Returns:** Tuple of accessor and setter

#### `createPlatform()`

Create platform primitives for detecting the current platform.

This is a static primitive (no reactive signals) since the platform
does not change during the lifecycle of the app.

```typescript
function createPlatform(): PlatformPrimitives
```

**Returns:** Platform primitives object

#### `createPromise(asyncFn)`

Primitive that wraps an async function with reactive state tracking.

```typescript
function createPromise(asyncFn: T): CreatePromiseReturn<Awaited<ReturnType<T>>>
```

- `asyncFn` — The async function to wrap

**Returns:** Object with state accessor, call, cancel, and reset functions

#### `createPush()`

Create push notification primitives.

```typescript
function createPush(): PushPrimitives
```

**Returns:** Push primitives object

#### `createRouter()`

Create router primitives for navigation state and actions.

```typescript
function createRouter(): RouterPrimitives
```

**Returns:** Router primitives object

#### `createRouterFromInstance(router)`

Create router primitives from a specific router.

```typescript
function createRouterFromInstance(router: Router): RouterPrimitives
```

- `router` — Router instance

**Returns:** Router primitives

#### `createRouterHelpers()`

Creates a router helpers.

```typescript
function createRouterHelpers(): { navigate: (path: string, options?: NavigateOptions) => void; navigateTo: (name: string, params?: RouteParams, query?: QueryParams, options?: NavigateOptions) => void; back: () => void; forward: () => void; getLocation: () => RouteLocation; getParams: () => RouteParams; getQuery: () => QueryParams; isActive: (path: string) => boolean; }
```

**Returns:** The created result.

#### `createSignalStore(initial)`

Create a simple signal-based store without provider.

```typescript
function createSignalStore(initial: T): [Accessor<T>, (value: T | ((prev: T) => T)) => void]
```

- `initial` — Initial state

**Returns:** The created instance.

#### `createSignup()`

Creates a signup primitive with async state tracking.

```typescript
function createSignup(): CreateSignupReturn<T>
```

**Returns:** Signup state and action

#### `createStateHelpers()`

Creates a state helpers.

```typescript
function createStateHelpers(): { createStore: <T extends object>(config: StoreConfig<T>) => Store<T>; }
```

**Returns:** The created result.

#### `createStateHelpersFromProvider(provider)`

Creates a state helpers from provider.

```typescript
function createStateHelpersFromProvider(provider: StateProvider): { createStore: <T extends object>(config: StoreConfig<T>) => Store<T>; }
```

- `provider` — The provider implementation.

**Returns:** The created result.

#### `createStorage()`

Create storage primitives.

```typescript
function createStorage(): { get: <T>(key: string) => Promise<T | null>; set: <T>(key: string, value: T) => Promise<void>; remove: (key: string) => Promise<void>; clear: () => Promise<void>; keys: () => Promise<string[]>; }
```

**Returns:** Storage methods

#### `createStorageFromProvider(storage)`

Create storage primitives from a specific provider.

```typescript
function createStorageFromProvider(storage: StorageProvider): { get: <T>(key: string) => Promise<T | null>; set: <T>(key: string, value: T) => Promise<void>; remove: (key: string) => Promise<void>; clear: () => Promise<void>; keys: () => Promise<string[]>; }
```

- `storage` — Storage provider

**Returns:** Storage methods

#### `createStorageHelpers()`

Create storage helpers from context.

```typescript
function createStorageHelpers(): { get: <T>(key: string) => Promise<T | null>; set: <T>(key: string, value: T) => Promise<void>; remove: (key: string) => Promise<void>; clear: () => Promise<void>; keys: () => Promise<string[]>; }
```

**Returns:** Storage helper functions

#### `createStorageValue(key, defaultValue)`

Create a storage value primitive.

```typescript
function createStorageValue(key: string, defaultValue?: T): { value: () => T | undefined; loading: () => boolean; error: () => Error | null; set: (value: T) => Promise<void>; remove: () => Promise<void>; refresh: () => Promise<T | undefined>; }
```

- `key` — Storage key
- `defaultValue` — Default value if not found

**Returns:** Storage value accessor and actions

#### `createStorageValueFromProvider(storage, key, defaultValue)`

Create storage value primitive from a specific provider.

```typescript
function createStorageValueFromProvider(storage: StorageProvider, key: string, defaultValue?: T): { value: () => T | undefined; loading: () => boolean; error: () => Error | null; set: (value: T) => Promise<void>; remove: () => Promise<void>; }
```

- `storage` — Storage provider
- `key` — Storage key
- `defaultValue` — Default value

**Returns:** Storage value accessor and actions

#### `createStore(config)`

Create a reactive store using Solid signals.

```typescript
function createStore(config: StoreConfig<T>): Store<T>
```

- `config` — Store configuration

**Returns:** Store instance

#### `createTheme()`

Create theme primitives for theme state and actions.

```typescript
function createTheme(): ThemePrimitives
```

**Returns:** The created instance.

#### `createThemeColors(theme)`

Create a colors accessor derived from a theme accessor.

```typescript
function createThemeColors(theme: Accessor<Theme>): Accessor<ThemeColors>
```

- `theme` — Theme accessor (e.g. from createTheme().theme)

**Returns:** Accessor for the current theme colors

#### `createThemeFromProvider(provider)`

Create theme primitives from a specific provider.

```typescript
function createThemeFromProvider(provider: ThemeProvider): ThemePrimitives
```

- `provider` — Theme provider

**Returns:** Theme primitives

#### `createThemeHelpers()`

Creates a theme helpers.

```typescript
function createThemeHelpers(): { getTheme: () => Theme; setTheme: (name: string) => void; getMode: () => "light" | "dark"; toggleMode: () => void; getAvailableThemes: () => Theme[]; }
```

**Returns:** The created result.

#### `createVersion()`

Create version primitives for tracking app updates.

```typescript
function createVersion(): VersionPrimitives
```

**Returns:** Version primitives object

#### `createWatchSignal(controller, name)`

Create a reactive accessor that tracks a single field's value.

```typescript
function createWatchSignal(controller: FormController<T>, name: K): Accessor<T[K]>
```

- `controller` — Form controller
- `name` — Field name to watch

**Returns:** Accessor for the field value

#### `getChildLogger(name, context)`

Create a child logger with additional context.

```typescript
function getChildLogger(name: string, context: Record<string, unknown>): Logger
```

- `name` — Parent logger name
- `context` — Additional context

**Returns:** Child logger instance

#### `getLogger(name)`

Get a logger instance.

```typescript
function getLogger(name?: string): Logger
```

- `name` — Logger name

**Returns:** Logger instance

#### `getRootLogger()`

Get the root logger.

```typescript
function getRootLogger(): Logger
```

**Returns:** Root logger instance

#### `useComponentLogger(componentName)`

Create a component logger that includes component name in context.

```typescript
function useComponentLogger(componentName: string): Logger
```

- `componentName` — Name of the component

**Returns:** Logger configured for the component

#### `useFetch(url, config)`

Create a resource for fetching data.

```typescript
function useFetch(url: string | Accessor<string>, config?: RequestConfig): Resource<T | undefined>
```

- `url` — URL string or accessor returning a URL string.
- `config` — Optional request configuration.

**Returns:** Solid resource

#### `useLazyQuery()`

Hook for lazy query.

```typescript
function useLazyQuery(): { execute: (url: string, config?: RequestConfig) => Promise<T>; data: () => T | null; isLoading: () => boolean; error: () => Error | null; reset: () => void; }
```

**Returns:** The result.

#### `useLocale()`

Get current locale as accessor.

```typescript
function useLocale(): Accessor<string>
```

**Returns:** Accessor for current locale

#### `useLocation()`

Get current route location as accessor.

```typescript
function useLocation(): Accessor<RouteLocation>
```

**Returns:** Accessor for current location

#### `useMatch(pattern)`

Create a match accessor for a path pattern.

```typescript
function useMatch(pattern: string): Accessor<boolean>
```

- `pattern` — Path pattern to match

**Returns:** Accessor indicating if current path matches

#### `useMode()`

Create a mode accessor.

```typescript
function useMode(): Accessor<"light" | "dark">
```

**Returns:** Accessor for current mode

#### `useMutation()`

Hook for mutation.

```typescript
function useMutation(): { mutate: (url: string, payload?: unknown, method?: "POST" | "PUT" | "PATCH" | "DELETE") => Promise<T>; isLoading: Accessor<boolean>; error: Accessor<Error | null>; data: Accessor<T | null>; reset: () => void; }
```

**Returns:** The result.

#### `useNavigate()`

Get navigate function.

```typescript
function useNavigate(): (path: string, options?: NavigateOptions) => void
```

**Returns:** Navigate function

#### `useParams()`

Get current route params as accessor.

```typescript
function useParams(): Accessor<RouteParams>
```

**Returns:** Accessor for route params

#### `usePersistedSignal(key, defaultValue)`

Create a persisted signal that syncs with storage.

```typescript
function usePersistedSignal(key: string, defaultValue: T): [Accessor<T | undefined>, (value: T | ((prev: T | undefined) => T)) => void]
```

- `key` — Storage key
- `defaultValue` — Default value

**Returns:** Tuple of accessor and setter

#### `usePlural(key, count, values)`

Create a reactive plural translation.

```typescript
function usePlural(key: string, count: Accessor<number>, values?: InterpolationValues): Accessor<string>
```

- `key` — Translation key
- `count` — Count accessor for pluralization
- `values` — Interpolation values for the translation.

**Returns:** Accessor for translated string

#### `useQuery()`

Get current query params as accessor.

```typescript
function useQuery(): Accessor<QueryParams>
```

**Returns:** Accessor for query params

#### `useStore(store, selector)`

Use a store with optional selector, returning an accessor.

```typescript
function useStore(store: Store<T>, selector?: ((state: T) => S)): Accessor<S>
```

- `store` — Store to subscribe to
- `selector` — Optional selector function

**Returns:** Accessor for selected state

#### `useThemeName()`

Create a theme name accessor.

```typescript
function useThemeName(): Accessor<string>
```

**Returns:** Accessor for current theme name

#### `useTranslate()`

Get translate function.

```typescript
function useTranslate(): TranslateFunction
```

**Returns:** Translate function

#### `useTranslation(key, values, options)`

Create a reactive translation.

```typescript
function useTranslation(key: string, values?: InterpolationValues, options?: TranslateOptions): Accessor<string>
```

- `key` — Translation key
- `values` — Interpolation values for the translation.
- `options` — Translation options

**Returns:** Accessor for translated string

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-auth` ^1.0.0
- `@molecule/app-forms` ^1.0.0
- `@molecule/app-http` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-routing` ^1.0.0
- `@molecule/app-state` ^1.0.0
- `@molecule/app-storage` ^1.0.0
- `@molecule/app-theme` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-version` ^1.0.0
- `@molecule/app-device` ^1.0.0
- `@molecule/app-platform` ^1.0.0
- `@molecule/app-push` ^1.0.0
- `solid-js` ^1.8.0

## Translations

Translation strings are provided by `@molecule/app-locales-solid`.
