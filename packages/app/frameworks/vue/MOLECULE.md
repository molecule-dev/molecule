# @molecule/app-vue

Vue framework bindings for molecule.dev.

Provides Vue-specific composables and plugins for all molecule
core interfaces. This package enables the use of molecule's framework-agnostic
interfaces with Vue's idioms (Composition API, provide/inject, etc.).

## Type
`framework`

## Installation
```bash
npm install @molecule/app-vue
```

## Usage

```ts
import { createApp } from 'vue'
import { moleculePlugin, useAuth, useTheme, useStore } from '@molecule/app-vue'
import { provider as stateProvider } from '@molecule/app-state-pinia'

// Setup plugin
const app = createApp(App)
app.use(moleculePlugin, {
  state: stateProvider,
  auth: authClient,
  theme: themeProvider,
})
app.mount('#app')

// Use composables in components
// <script setup>
import { useAuth, useTheme, useStore } from '@molecule/app-vue'

const { user, logout } = useAuth()
const { theme, toggleTheme } = useTheme()
const count = useStore(counterStore)
// </script>
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

#### `MoleculePluginOptions`

Options for the molecule Vue plugin.

```typescript
interface MoleculePluginOptions {
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

#### `RouterConfig`

Configuration options for creating a router instance.

```typescript
interface RouterConfig {
    /**
     * Router mode.
     */
    mode?: 'history' | 'hash' | 'memory';
    /**
     * Base path.
     */
    basePath?: string;
    /**
     * Initial routes.
     */
    routes?: RouteDefinition[];
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

#### `UseAsyncStateReturn`

Return type for the {@link useAsyncState} composable.

```typescript
interface UseAsyncStateReturn<T> {
  /** The reactive state value. */
  state: Ref<T>
  /** Set the state to a new value, function updater, or promise. */
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  /** Merge a partial value into the state (object states only). */
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
}
```

#### `UseAuthReturn`

Return type for useAuth composable.

```typescript
interface UseAuthReturn<T = unknown> {
  state: ComputedRef<AuthState<T>>
  user: ComputedRef<T | null>
  isAuthenticated: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T>['register']
  refresh: AuthClient<T>['refresh']
}
```

#### `UseCapacitorAppReturn`

Return type for the useCapacitorApp composable.

```typescript
interface UseCapacitorAppReturn {
  ready: ComputedRef<boolean>
  deviceReady: ComputedRef<boolean>
  pushReady: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  initialize: () => Promise<void>
}
```

#### `UseChangePasswordReturn`

Return type for the {@link useChangePassword} composable.

```typescript
interface UseChangePasswordReturn {
  status: ComputedRef<PromiseStatus>
  error: ComputedRef<Error | null>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
}
```

#### `UseDeviceReturn`

Return type for the useDevice composable.

```typescript
interface UseDeviceReturn {
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

#### `UseFormOptions`

Options for useForm composable.

```typescript
interface UseFormOptions<T extends Record<string, unknown>> extends FormOptions<T> {
  /**
   * Form provider's createForm function.
   */
  createForm: (options: FormOptions<T>) => FormController<T>
}
```

#### `UseFormReturn`

Return type for useForm composable.

```typescript
interface UseFormReturn<T extends Record<string, unknown>> {
  // State
  formState: ComputedRef<FormState<T>>
  isValid: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  isSubmitting: ComputedRef<boolean>

  // Field methods
  register: (name: keyof T, options?: RegisterOptions) => FieldRegistration
  getValue: <K extends keyof T>(name: K) => T[K]
  setValue: <K extends keyof T>(name: K, value: T[K]) => void
  getError: (name: keyof T) => string | undefined
  setError: (name: keyof T, error: string | undefined) => void
  clearErrors: () => void

  // Form methods
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: Partial<Record<keyof T, string>>) => void,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>
  reset: (values?: Partial<T>) => void
  validate: () => Promise<boolean>

  // Form controller (for use with useWatch/useFieldState)
  form: FormController<T>
}
```

#### `UseHttpOptions`

Options for useHttp composable.

```typescript
interface UseHttpOptions {
  immediate?: boolean
  onSuccess?: <T>(data: T) => void
  onError?: (error: Error) => void
}
```

#### `UseHttpReturn`

Return type for useHttp composable.

```typescript
interface UseHttpReturn<T> extends UseHttpState<T> {
  execute: () => Promise<T | null>
  reset: () => void
}
```

#### `UseHttpState`

State for async HTTP operations.

```typescript
interface UseHttpState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
}
```

#### `UseLoginReturn`

Return type for the {@link useLogin} composable.

```typescript
interface UseLoginReturn<T = unknown> {
  status: ComputedRef<PromiseStatus>
  value: ComputedRef<AuthResult<T> | null>
  error: ComputedRef<Error | null>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
}
```

#### `UseOAuthOptions`

OAuth configuration options.

```typescript
interface UseOAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}
```

#### `UseOAuthReturn`

Return type for the {@link useOAuth} composable.

```typescript
interface UseOAuthReturn {
  providers: ComputedRef<string[]>
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
}
```

#### `UsePasswordResetReturn`

Return type for usePasswordReset composable.

```typescript
interface UsePasswordResetReturn {
  requestStatus: ComputedRef<PromiseStatus>
  requestError: ComputedRef<Error | null>
  confirmStatus: ComputedRef<PromiseStatus>
  confirmError: ComputedRef<Error | null>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
}
```

#### `UsePlatformReturn`

Return type for the usePlatform composable.

```typescript
interface UsePlatformReturn {
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

#### `UsePromiseReturn`

Return type for usePromise composable.

```typescript
interface UsePromiseReturn<T> {
  /** Current status of the async operation. */
  status: ComputedRef<PromiseStatus>
  /** Resolved value, or null if not yet resolved. */
  value: ComputedRef<T | null>
  /** Rejection error, or null if not rejected. */
  error: ComputedRef<Error | null>
  /** Invoke the async function. Returns a promise that resolves with the result. */
  call: (...args: any[]) => Promise<T>
  /** Cancel the current in-flight call. */
  cancel: (message?: string) => void
  /** Reset state to idle with null value and error. */
  reset: () => void
}
```

#### `UsePushReturn`

Return type for the usePush composable.

```typescript
interface UsePushReturn {
  permission: ShallowRef<PermissionStatus | null>
  token: ShallowRef<PushToken | null>
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

#### `UseRouterReturn`

Return type for useRouter composable.

```typescript
interface UseRouterReturn {
  location: ComputedRef<ReturnType<Router['getLocation']>>
  params: ComputedRef<RouteParams>
  query: ComputedRef<QueryParams>
  navigate: Router['navigate']
  navigateTo: Router['navigateTo']
  back: Router['back']
  forward: Router['forward']
  isActive: Router['isActive']
}
```

#### `UseSignupReturn`

Return type for useSignup composable.

```typescript
interface UseSignupReturn<T = unknown> {
  status: ComputedRef<PromiseStatus>
  value: ComputedRef<AuthResult<T> | null>
  error: ComputedRef<Error | null>
  signup: (data: RegisterData) => Promise<AuthResult<T>>
  reset: () => void
}
```

#### `UseStorageValueOptions`

Options for useStorageValue composable.

```typescript
interface UseStorageValueOptions<T> {
  defaultValue?: T
}
```

#### `UseStorageValueReturn`

Return type for useStorageValue composable.

```typescript
interface UseStorageValueReturn<T> {
  value: Ref<T | undefined>
  loading: Ref<boolean>
  error: Ref<Error | null>
  setValue: (value: T) => Promise<void>
  removeValue: () => Promise<void>
}
```

#### `UseStoreOptions`

Options for useStore composable.

```typescript
interface UseStoreOptions<T, S> {
  selector?: (state: T) => S
}
```

#### `UseThemeReturn`

Return type for useTheme composable.

```typescript
interface UseThemeReturn {
  theme: ComputedRef<Theme>
  themeName: ComputedRef<string>
  mode: ComputedRef<'light' | 'dark'>
  setTheme: (name: string) => void
  toggleTheme: () => void
}
```

#### `UseTranslationReturn`

Return type for useTranslation composable.

```typescript
interface UseTranslationReturn {
  t: I18nProvider['t']
  locale: ComputedRef<string>
  direction: ComputedRef<'ltr' | 'rtl'>
  locales: ComputedRef<ReturnType<I18nProvider['getLocales']>>
  setLocale: I18nProvider['setLocale']
  formatNumber: I18nProvider['formatNumber']
  formatDate: I18nProvider['formatDate']
}
```

#### `UseVersionReturn`

Return type for the useVersion composable.

```typescript
interface UseVersionReturn {
  state: ComputedRef<VersionState>
  isUpdateAvailable: ComputedRef<boolean>
  isChecking: ComputedRef<boolean>
  isServiceWorkerWaiting: ComputedRef<boolean>
  newVersion: ComputedRef<string | undefined>
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
}
```

### Functions

#### `createAuthPlugin(client)`

Creates a Vue plugin that provides an auth service via dependency injection.

```typescript
function createAuthPlugin(client: AuthClient<T>): Plugin
```

- `client` — The auth client to inject into the Vue application.

**Returns:** A Vue plugin that provides the auth client to all descendant components.

#### `createHttpPlugin(client)`

Creates a Vue plugin that provides an HTTP service via dependency injection.

```typescript
function createHttpPlugin(client: HttpClient): Plugin
```

- `client` — The HTTP client to inject into the Vue application.

**Returns:** A Vue plugin that provides the HTTP client to all descendant components.

#### `createI18nPlugin(provider)`

Creates a Vue plugin that provides an i18n service via dependency injection.

```typescript
function createI18nPlugin(provider: I18nProvider): Plugin
```

- `provider` — The i18n provider to inject into the Vue application.

**Returns:** A Vue plugin that provides the i18n service to all descendant components.

#### `createLoggerPlugin(provider)`

Creates a Vue plugin that provides a logger service via dependency injection.

```typescript
function createLoggerPlugin(provider: LoggerProvider): Plugin
```

- `provider` — The logger provider to inject into the Vue application.

**Returns:** A Vue plugin that provides the logger service to all descendant components.

#### `createRouterPlugin(router)`

Creates a Vue plugin that provides a router service via dependency injection.

```typescript
function createRouterPlugin(router: Router): Plugin
```

- `router` — The router instance to inject into the Vue application.

**Returns:** A Vue plugin that provides the router to all descendant components.

#### `createStatePlugin(provider)`

Creates a Vue plugin that provides a state service via dependency injection.

```typescript
function createStatePlugin(provider: StateProvider): Plugin
```

- `provider` — The state provider to inject into the Vue application.

**Returns:** A Vue plugin that provides the state service to all descendant components.

#### `createStoragePlugin(provider)`

Creates a Vue plugin that provides a storage service via dependency injection.

```typescript
function createStoragePlugin(provider: StorageProvider): Plugin
```

- `provider` — The storage provider to inject into the Vue application.

**Returns:** A Vue plugin that provides the storage service to all descendant components.

#### `createThemePlugin(provider)`

Creates a Vue plugin that provides a theme service via dependency injection.

```typescript
function createThemePlugin(provider: ThemeProvider): Plugin
```

- `provider` — The theme provider to inject into the Vue application.

**Returns:** A Vue plugin that provides the theme service to all descendant components.

#### `useAsyncState(initialValue)`

Vue composable for async-capable state management.

Provides a reactive state ref with `setState` and `extendState` methods
that accept synchronous values, updater functions, or promises.

```typescript
function useAsyncState(initialValue: T): UseAsyncStateReturn<T>
```

- `initialValue` — The initial state value

**Returns:** Reactive state and setter methods

#### `useAuth()`

Composable for authentication state and actions.

```typescript
function useAuth(): UseAuthReturn<T>
```

**Returns:** Auth state and action methods

#### `useAuthClient()`

Composable to access the auth client from injection.

```typescript
function useAuthClient(): AuthClient<T>
```

**Returns:** The auth client

#### `useCapacitorApp(options)`

Composable for Capacitor app initialization.

Wraps `createCapacitorApp` from `@molecule/app-platform` with Vue reactivity.
Auto-initializes on mount (inside a component) or eagerly (inside an effect scope).
Cleans up on scope dispose.

```typescript
function useCapacitorApp(options?: CapacitorAppOptions): UseCapacitorAppReturn
```

- `options` — Capacitor app configuration options

**Returns:** Reactive Capacitor app state including readiness flags, error, and an initialize method.

#### `useChangePassword()`

Composable for changing password with async state tracking.

```typescript
function useChangePassword(): UseChangePasswordReturn
```

**Returns:** Reactive status, error, a `changePassword` action, and a `reset` method.

#### `useChildLogger(parentName, context)`

Composable to create a child logger with additional context.

```typescript
function useChildLogger(parentName: string, context: Record<string, unknown>): Logger
```

- `parentName` — Parent logger name
- `context` — Additional context

**Returns:** Child logger instance

#### `useCurrentTheme()`

Composable to get just the current theme.

```typescript
function useCurrentTheme(): ComputedRef<Theme>
```

**Returns:** Computed theme reference

#### `useDelete(url, config, options)`

Composable for DELETE requests.

```typescript
function useDelete(url: string, config?: RequestConfig, options?: UseHttpOptions): UseHttpReturn<T>
```

- `url` — The request URL of the resource to delete.
- `config` — Optional HTTP request configuration (headers, params, etc.).
- `options` — Optional composable behavior options (immediate execution, callbacks).

**Returns:** Reactive request state (data, loading, error) and execute/reset methods.

#### `useDevice()`

Composable for device information.

Uses module-level getProvider() from `@molecule/app-device` (singleton).
Static — no reactivity needed. Just calls provider methods and returns plain values.

```typescript
function useDevice(): UseDeviceReturn
```

**Returns:** Device information and utility methods

#### `useDirection()`

Composable to get the text direction.

```typescript
function useDirection(): ComputedRef<"ltr" | "rtl">
```

**Returns:** Computed direction reference

#### `useFieldState(form, name)`

Composable to get field-level state.

```typescript
function useFieldState(form: FormController<T>, name: keyof T): ComputedRef<FieldState<T[keyof T]>>
```

- `form` — Form controller (from useForm().form)
- `name` — Field name

**Returns:** Computed field state (value, error, touched, dirty, valid, validating)

#### `useForm(options)`

Composable for form state management.

```typescript
function useForm(options: UseFormOptions<T>): UseFormReturn<T>
```

- `options` — Form options including createForm from a forms provider

**Returns:** Form state, computed properties, and methods

#### `useGet(url, config, options)`

Composable for GET requests.

```typescript
function useGet(url: string, config?: RequestConfig, options?: UseHttpOptions): UseHttpReturn<T>
```

- `url` — The request URL to fetch from.
- `config` — Optional HTTP request configuration (headers, params, etc.).
- `options` — Optional composable behavior options (immediate execution, callbacks).

**Returns:** Reactive request state (data, loading, error) and execute/reset methods.

#### `useHttp(method, url, config, options)`

Composable for making HTTP requests with state management.

```typescript
function useHttp(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, config?: RequestConfig, options?: UseHttpOptions): UseHttpReturn<T>
```

- `method` — HTTP method
- `url` — Request URL
- `config` — Request configuration
- `options` — Composable options

**Returns:** Request state and execute function

#### `useHttpClient()`

Composable to access the HTTP client from injection.

```typescript
function useHttpClient(): HttpClient
```

**Returns:** The HTTP client

#### `useI18nProvider()`

Composable to access the i18n provider from injection.

```typescript
function useI18nProvider(): I18nProvider
```

**Returns:** The i18n provider

#### `useIsActive(path, exact)`

Composable to check if a path is currently active.

```typescript
function useIsActive(path: string, exact?: boolean): ComputedRef<boolean>
```

- `path` — The path to check
- `exact` — Whether to match exactly (default: false)

**Returns:** Computed boolean indicating if the path is active

#### `useIsAuthenticated()`

Composable to check if user is authenticated.

```typescript
function useIsAuthenticated(): ComputedRef<boolean>
```

**Returns:** Computed authentication status

#### `useLocale()`

Composable to get the current locale.

```typescript
function useLocale(): ComputedRef<string>
```

**Returns:** Computed locale reference

#### `useLocation()`

Composable to get the current location.

```typescript
function useLocation(): ComputedRef<RouteLocation>
```

**Returns:** Computed location reference

#### `useLogger(name, config)`

Composable to get a logger instance.

```typescript
function useLogger(name: string, config?: Partial<LoggerConfig>): Logger
```

- `name` — Logger name (usually component name)
- `config` — Optional logger configuration

**Returns:** Logger instance

#### `useLoggerProvider()`

Composable to access the logger provider from injection.

```typescript
function useLoggerProvider(): LoggerProvider
```

**Returns:** The logger provider

#### `useLogin()`

Composable for login with async state tracking.

```typescript
function useLogin(): UseLoginReturn<T>
```

**Returns:** Reactive status, auth result value, error, a `login` action, and a `reset` method.

#### `useNavigate()`

Composable to get the navigate function.

```typescript
function useNavigate(): (path: string, options?: NavigateOptions) => void
```

**Returns:** A function that navigates to the given path with optional navigation options.

#### `useOAuth(options)`

Composable for OAuth authentication.

```typescript
function useOAuth(options?: UseOAuthOptions): UseOAuthReturn
```

- `options` — OAuth configuration (base URL, providers, endpoint path).

**Returns:** Available providers, a URL builder, and a redirect method for OAuth flows.

#### `useParams()`

Composable to get route parameters.

```typescript
function useParams(): ComputedRef<T>
```

**Returns:** Computed params reference

#### `usePasswordReset()`

Composable for password reset flow with async state tracking.

```typescript
function usePasswordReset(): UsePasswordResetReturn
```

**Returns:** Password reset state and actions

#### `usePatch(url, config, options)`

Composable for PATCH requests.

```typescript
function usePatch(url: string, config?: RequestConfig, options?: UseHttpOptions): UseHttpReturn<T>
```

- `url` — The request URL to send a partial update to.
- `config` — Optional HTTP request configuration (headers, body data, etc.).
- `options` — Optional composable behavior options (immediate execution, callbacks).

**Returns:** Reactive request state (data, loading, error) and execute/reset methods.

#### `usePlatform()`

Composable for platform detection.

Uses module-level platform() and isPlatform() from `@molecule/app-platform` (singleton).
Static — no reactivity needed.

```typescript
function usePlatform(): UsePlatformReturn
```

**Returns:** Platform information and utility methods

#### `usePost(url, config, options)`

Composable for POST requests.

```typescript
function usePost(url: string, config?: RequestConfig, options?: UseHttpOptions): UseHttpReturn<T>
```

- `url` — The request URL to send data to.
- `config` — Optional HTTP request configuration (headers, body data, etc.).
- `options` — Optional composable behavior options (immediate execution, callbacks).

**Returns:** Reactive request state (data, loading, error) and execute/reset methods.

#### `usePromise(fn)`

Vue composable for tracking async function state.

Wraps an async function and provides reactive state tracking for its
pending/resolved/rejected status, along with cancellation and reset support.

```typescript
function usePromise(fn: (...args: any[]) => Promise<T>): UsePromiseReturn<T>
```

- `fn` — The async function to track

**Returns:** Reactive state and control methods

#### `usePush()`

Composable for push notifications.

Uses module-level getProvider() from `@molecule/app-push` (singleton).
Wraps async methods to update reactive refs for permission and token.

```typescript
function usePush(): UsePushReturn
```

**Returns:** Push notification state and action methods

#### `usePut(url, config, options)`

Composable for PUT requests.

```typescript
function usePut(url: string, config?: RequestConfig, options?: UseHttpOptions): UseHttpReturn<T>
```

- `url` — The request URL to send a full replacement to.
- `config` — Optional HTTP request configuration (headers, body data, etc.).
- `options` — Optional composable behavior options (immediate execution, callbacks).

**Returns:** Reactive request state (data, loading, error) and execute/reset methods.

#### `useQuery()`

Composable to get query parameters.

```typescript
function useQuery(): ComputedRef<T>
```

**Returns:** A computed ref containing the current URL query parameters.

#### `useRootLogger()`

Composable to get the root logger.

```typescript
function useRootLogger(): Logger
```

**Returns:** Root logger instance

#### `useRouter()`

Composable for routing state and actions.

```typescript
function useRouter(): UseRouterReturn
```

**Returns:** Router state and navigation methods

#### `useRouterInstance()`

Composable to access the router from injection.

```typescript
function useRouterInstance(): Router
```

**Returns:** The router

#### `useSetStore(store)`

Composable to get store's setState function.

```typescript
function useSetStore(store: Store<T>): (partial: Partial<T> | ((state: T) => Partial<T>)) => void
```

- `store` — The store

**Returns:** The setState function

#### `useSignup()`

Composable for user registration with async state tracking.

```typescript
function useSignup(): UseSignupReturn<T>
```

**Returns:** Signup state and action

#### `useStateProvider()`

Composable to access the state provider from injection.

```typescript
function useStateProvider(): StateProvider
```

**Returns:** The state provider

#### `useStorage()`

Composable for direct storage operations.

```typescript
function useStorage(): { get: <T>(key: string) => Promise<T | null>; set: <T>(key: string, value: T) => Promise<void>; remove: (key: string) => Promise<void>; clear: () => Promise<void>; keys: () => Promise<string[]>; }
```

**Returns:** Storage operation methods

#### `useStorageProvider()`

Composable to access the storage provider from injection.

```typescript
function useStorageProvider(): StorageProvider
```

**Returns:** The storage provider

#### `useStorageValue(key, options)`

Composable to manage a single storage value with Vue reactivity.

```typescript
function useStorageValue(key: string, options?: UseStorageValueOptions<T>): UseStorageValueReturn<T>
```

- `key` — Storage key
- `options` — Composable options

**Returns:** Value, setter, and loading state

#### `useStore(store, options)`

Composable to subscribe to a store with optional selector.

```typescript
function useStore(store: Store<T>, options?: UseStoreOptions<T, S>): Ref<S, S>
```

- `store` — The store to subscribe to
- `options` — Composable options (selector)

**Returns:** Reactive state reference

#### `useStoreComputed(store, selector)`

Composable to create a computed store value.

```typescript
function useStoreComputed(store: Store<T>, selector: (state: T) => S): ComputedRef<S>
```

- `store` — The store
- `selector` — Selector function

**Returns:** Computed reference

#### `useT()`

Composable to get just the translation function.

```typescript
function useT(): (key: string, values?: InterpolationValues) => string
```

**Returns:** Translation function

#### `useTheme()`

Composable for theme state and actions.

```typescript
function useTheme(): UseThemeReturn
```

**Returns:** Theme state and actions

#### `useThemeColors()`

Composable to get the current theme colors.

```typescript
function useThemeColors(): ComputedRef<ThemeColors>
```

**Returns:** Computed colors reference

#### `useThemeMode()`

Composable to get just the theme mode.

```typescript
function useThemeMode(): ComputedRef<"light" | "dark">
```

**Returns:** Computed mode reference

#### `useThemeProvider()`

Composable to access the theme provider from injection.

```typescript
function useThemeProvider(): ThemeProvider
```

**Returns:** The theme provider

#### `useTranslation()`

Composable for internationalization.

```typescript
function useTranslation(): UseTranslationReturn
```

**Returns:** Translation function and locale management

#### `useUser()`

Composable to get just the authenticated user.

```typescript
function useUser(): ComputedRef<T | null>
```

**Returns:** Computed user reference

#### `useVersion()`

Composable for version and update management.

Uses module-level getProvider() from `@molecule/app-version` (singleton).

```typescript
function useVersion(): UseVersionReturn
```

**Returns:** The result.

#### `useWatch(form, name)`

Composable to watch a specific field value.

```typescript
function useWatch(form: FormController<T>, name: K): ComputedRef<T[K]>
```

- `form` — Form controller (from useForm().form)
- `name` — Field name to watch

**Returns:** Computed reference to the field value

### Constants

#### `AuthKey`

Injection key for auth client.

```typescript
const AuthKey: InjectionKey<AuthClient<unknown>>
```

#### `HttpKey`

Injection key for HTTP client.

```typescript
const HttpKey: InjectionKey<HttpClient>
```

#### `I18nKey`

Injection key for i18n provider.

```typescript
const I18nKey: InjectionKey<I18nProvider>
```

#### `LoggerKey`

Injection key for logger provider.

```typescript
const LoggerKey: InjectionKey<LoggerProvider>
```

#### `moleculePlugin`

Vue plugin that provides all molecule services.

```typescript
const moleculePlugin: Plugin<MoleculePluginOptions>
```

#### `RouterKey`

Injection key for router.

```typescript
const RouterKey: InjectionKey<Router>
```

#### `StateKey`

Injection key for state provider.

```typescript
const StateKey: InjectionKey<StateProvider>
```

#### `StorageKey`

Injection key for storage provider.

```typescript
const StorageKey: InjectionKey<StorageProvider>
```

#### `ThemeKey`

Injection key for theme provider.

```typescript
const ThemeKey: InjectionKey<ThemeProvider>
```

## Injection Notes

### Requirements

Peer dependencies:
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
- `vue` ^3.4.0

## Translations

Translation strings are provided by `@molecule/app-locales-vue`.
