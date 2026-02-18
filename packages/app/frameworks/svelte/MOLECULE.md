# @molecule/app-svelte

Svelte framework bindings for molecule.dev.

Provides Svelte-specific stores and context utilities for all molecule
core interfaces. This package enables the use of molecule's framework-agnostic
interfaces with Svelte's idioms (stores, context, etc.).

## Type
`framework`

## Installation
```bash
npm install @molecule/app-svelte
```

## Usage

```svelte
<!-- +layout.svelte -->
<script>
  import { setMoleculeContext } from '@molecule/app-svelte'
  import { provider as stateProvider } from '@molecule/app-state-zustand'

  setMoleculeContext({
    state: stateProvider,
    auth: authClient,
    theme: themeProvider,
  })
</script>

<slot />

<!-- Component.svelte -->
<script>
  import { createAuthStores, createThemeStores } from '@molecule/app-svelte'

  const { user, isAuthenticated, logout } = createAuthStores()
  const { theme, toggleTheme, mode } = createThemeStores()
</script>

{#if $isAuthenticated}
  <div style:background={$theme.colors.background}>
    <h1>Welcome, {$user?.name}!</h1>
    <button on:click={toggleTheme}>Toggle ({$mode})</button>
    <button on:click={logout}>Logout</button>
  </div>
{/if}
```

## API

### Interfaces

#### `AsyncStateStore`

Async state store.

```typescript
interface AsyncStateStore<T> extends Writable<T> {
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
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

Configuration for molecule Svelte context.

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

#### `OAuthHelpers`

OAuth helpers returned by {@link createOAuthHelpers}.

```typescript
interface OAuthHelpers {
  providers: Readable<string[]>
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
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

#### `PasswordResetStores`

Password reset stores.

```typescript
interface PasswordResetStores {
  request: Readable<PromiseState<void>> & {
    call: (data: PasswordResetRequest) => Promise<void>
    cancel: (message?: string) => void
    reset: () => void
  }
  confirm: Readable<PromiseState<void>> & {
    call: (data: PasswordResetConfirm) => Promise<void>
    cancel: (message?: string) => void
    reset: () => void
  }
  resetAll: () => void
}
```

#### `PromiseStore`

Promise store with action methods.

```typescript
interface PromiseStore<T> extends Readable<PromiseState<T>> {
  call: (...args: any[]) => Promise<T>
  cancel: (message?: string) => void
  reset: () => void
}
```

#### `Readable`

Readable interface for subscribing.

```typescript
interface Readable<T> {
		/**
		 * Subscribe on value changes.
		 * @param run subscription callback
		 * @param invalidate cleanup callback
		 */
		subscribe(this: void, run: Subscriber<T>, invalidate?: () => void): Unsubscriber;
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

#### `Writable`

Writable interface for both updating and subscribing.

```typescript
interface Writable<T> extends Readable<T> {
		/**
		 * Set value and inform subscribers.
		 * @param value to set
		 */
		set(this: void, value: T): void;

		/**
		 * Update value using callback and inform subscribers.
		 * @param updater callback
		 */
		update(this: void, updater: Updater<T>): void;
	}
```

### Types

#### `CapacitorAppStore`

Return type for the Capacitor app store.

```typescript
type CapacitorAppStore = Readable<CapacitorAppState> & {
  initialize: () => Promise<void>
}
```

#### `ChangePasswordStore`

Change password store type.

```typescript
type ChangePasswordStore = PromiseStore<void>
```

#### `LoginStore`

Login store type.

```typescript
type LoginStore<T = unknown> = PromiseStore<AuthResult<T>>
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

#### `SignupStore`

Signup store type.

```typescript
type SignupStore<T = unknown> = PromiseStore<AuthResult<T>>
```

### Functions

#### `createAsyncState(initialValue)`

Creates a writable store with async-capable setState and extendState.

```typescript
function createAsyncState(initialValue: T): AsyncStateStore<T>
```

- `initialValue` — The initial state value

**Returns:** The created instance.

#### `createAuthStores()`

Create auth stores from the auth client in context.

```typescript
function createAuthStores(): AuthStores<T> & { error: Readable<string | null>; }
```

**Returns:** Auth stores and actions

#### `createAuthStoresFromClient(client)`

Create auth stores from a specific auth client.

Use this when you don't want to use context.

```typescript
function createAuthStoresFromClient(client: AuthClient<T>): AuthStores<T>
```

- `client` — Auth client

**Returns:** Auth stores and actions

#### `createCapacitorAppStore(options)`

Create a Svelte store wrapping the Capacitor app coordinator.

Creates a CapacitorApp instance, subscribes to state changes,
and auto-initializes. The returned store is readable and also
exposes an `initialize` method for manual re-initialization.

```typescript
function createCapacitorAppStore(options?: CapacitorAppOptions): CapacitorAppStore
```

- `options` — Capacitor app options

**Returns:** A readable store of CapacitorAppState with an initialize method

#### `createChangePasswordStore()`

Creates a change password store with async state tracking.

```typescript
function createChangePasswordStore(): ChangePasswordStore
```

**Returns:** Change password promise store

#### `createDeleteStore(url, config)`

Creates a DELETE request store.

```typescript
function createDeleteStore(url: string, config?: RequestConfig): HttpStore<T>
```

- `url` — The request endpoint URL.
- `config` — Optional request configuration such as headers or params.

**Returns:** A subscribable HTTP store for the DELETE request with execute and reset methods.

#### `createDeviceStores()`

Create device stores from the module-level device provider.

Device information is static (no reactive subscription needed),
so this returns plain values rather than Svelte stores.

```typescript
function createDeviceStores(): { deviceInfo: DeviceInfo; screenInfo: ScreenInfo; hardwareInfo: HardwareInfo; featureSupport: FeatureSupport; supports: (feature: keyof FeatureSupport) => boolean; isOnline: () => boolean; isStandalone: () => boolean; language: string; languages: string[]; }
```

**Returns:** Device information and utility functions

#### `createFieldStore(controller, name)`

Create a readable store that tracks a single field's state.

```typescript
function createFieldStore(controller: FormController<T>, name: K): Readable<FieldState<T[K]>>
```

- `controller` — Form controller
- `name` — Field name to track

**Returns:** Readable store of the field state

#### `createFormStores(provider, options)`

Create form stores from a form provider and options.

```typescript
function createFormStores(provider: FormProvider, options: FormOptions<T>): FormStores<T>
```

- `provider` — Form provider instance
- `options` — Form creation options

**Returns:** Form stores and actions

#### `createGetStore(url, config)`

Creates a GET request store.

```typescript
function createGetStore(url: string, config?: RequestConfig): HttpStore<T>
```

- `url` — The request endpoint URL.
- `config` — Optional request configuration such as headers or params.

**Returns:** A subscribable HTTP store for the GET request with execute and reset methods.

#### `createHttpStore(method, url, config)`

Create an HTTP request store.

```typescript
function createHttpStore(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, config?: RequestConfig): HttpStore<T>
```

- `method` — HTTP method
- `url` — Request URL
- `config` — Request configuration

**Returns:** Store with state and actions

#### `createHttpStoresFromClient(client)`

Creates HTTP store factory methods bound to a specific client instance.

```typescript
function createHttpStoresFromClient(client: HttpClient): HttpStoreFactory
```

- `client` — The HTTP client to use for all created stores.

**Returns:** An object with get, post, put, patch, and delete factory methods.

#### `createI18nStores()`

Create i18n stores from the i18n provider in context.

```typescript
function createI18nStores(): I18nStores
```

**Returns:** I18n stores and actions

#### `createI18nStoresFromProvider(provider)`

Create i18n stores from a specific provider.

```typescript
function createI18nStoresFromProvider(provider: I18nProvider): I18nStores
```

- `provider` — I18n provider

**Returns:** I18n stores and actions

#### `createIsActiveStore(location, router, path, exact)`

Create a derived store that checks if a path is active.

```typescript
function createIsActiveStore(location: Readable<RouteLocation>, router: Router, path: string, exact?: boolean): Readable<boolean>
```

- `location` — A readable location store (from createRouterStores or createRouterStoresFromRouter)
- `router` — Router instance (for isActive check)
- `path` — Path to check
- `exact` — Whether to require exact match (default: false)

**Returns:** Readable store of whether the path is active

#### `createLogger(config)`

Create a logger with custom configuration.

```typescript
function createLogger(config: LoggerConfig): Logger
```

- `config` — Logger configuration

**Returns:** Logger instance

#### `createLoggerHelpers()`

Create logger helpers from context.

```typescript
function createLoggerHelpers(): LoggerHelpers
```

**Returns:** Logger helper functions

#### `createLoggerHelpersFromProvider(provider)`

Create logger helpers from a specific provider.

```typescript
function createLoggerHelpersFromProvider(provider: LoggerProvider): LoggerHelpers
```

- `provider` — Logger provider

**Returns:** Logger helper functions

#### `createLoginStore()`

Creates a login store with async state tracking.

```typescript
function createLoginStore(): LoginStore<T>
```

**Returns:** Login promise store

#### `createOAuthHelpers(options)`

Creates OAuth helpers for provider-based authentication flows.

```typescript
function createOAuthHelpers(options?: OAuthOptions): OAuthHelpers
```

- `options` — OAuth configuration including base URL, providers, and endpoint path.

**Returns:** An object containing a readable providers store, URL builder, and redirect function.

#### `createPasswordResetStores()`

Creates password reset stores with async state tracking.

```typescript
function createPasswordResetStores(): PasswordResetStores
```

**Returns:** Password reset stores for request and confirm steps

#### `createPatchStore(url, config)`

Creates a PATCH request store.

```typescript
function createPatchStore(url: string, config?: RequestConfig): HttpStore<T>
```

- `url` — The request endpoint URL.
- `config` — Optional request configuration such as headers or body data.

**Returns:** A subscribable HTTP store for the PATCH request with execute and reset methods.

#### `createPlatformStores()`

Create platform stores from the module-level platform info.

Platform information is static (no reactive subscription needed),
so this returns plain values rather than Svelte stores.

```typescript
function createPlatformStores(): { platform: Platform; isNative: boolean; isMobile: boolean; isDesktop: boolean; isWeb: boolean; isDevelopment: boolean; isProduction: boolean; isPlatform: (...platforms: Platform[]) => boolean; }
```

**Returns:** Platform information and utility functions

#### `createPostStore(url, config)`

Creates a POST request store.

```typescript
function createPostStore(url: string, config?: RequestConfig): HttpStore<T>
```

- `url` — The request endpoint URL.
- `config` — Optional request configuration such as headers or body data.

**Returns:** A subscribable HTTP store for the POST request with execute and reset methods.

#### `createPromiseStore(asyncFn)`

Creates a store that tracks async function state.

```typescript
function createPromiseStore(asyncFn: T): PromiseStore<Awaited<ReturnType<T>>>
```

- `asyncFn` — The async function to track

**Returns:** Promise store with subscribe, call, cancel, and reset

#### `createPushStores()`

Create push notification stores from the module-level push provider.

```typescript
function createPushStores(): { permission: Readable<PermissionStatus | null>; token: Readable<PushToken | null>; checkPermission: () => Promise<PermissionStatus>; requestPermission: () => Promise<PermissionStatus>; register: () => Promise<PushToken>; unregister: () => Promise<void>; onNotificationReceived: (listener: NotificationReceivedListener) => () => void; onNotificationAction: (listener: NotificationActionListener) => () => void; onTokenChange: (listener: TokenChangeListener) => () => void; setBadge: (count: number) => Promise<void>; clearBadge: () => Promise<void>; }
```

**Returns:** Push notification stores and actions

#### `createPutStore(url, config)`

Creates a PUT request store.

```typescript
function createPutStore(url: string, config?: RequestConfig): HttpStore<T>
```

- `url` — The request endpoint URL.
- `config` — Optional request configuration such as headers or body data.

**Returns:** A subscribable HTTP store for the PUT request with execute and reset methods.

#### `createRouterStores()`

Create router stores from the router in context.

```typescript
function createRouterStores(): RouterStores
```

**Returns:** Router stores and actions

#### `createRouterStoresFromRouter(router)`

Create router stores from a specific router.

```typescript
function createRouterStoresFromRouter(router: Router): RouterStores
```

- `router` — Router instance

**Returns:** Router stores and actions

#### `createSignupStore()`

Creates a signup store with async state tracking.

```typescript
function createSignupStore(): SignupStore<T>
```

**Returns:** Signup promise store

#### `createStorageHelpers()`

Create storage helper functions from context.

```typescript
function createStorageHelpers(): StorageHelpers
```

**Returns:** Storage functions

#### `createStorageStore(key, defaultValue)`

Create a storage value store.

```typescript
function createStorageStore(key: string, defaultValue?: T): StorageStore<T>
```

- `key` — Storage key
- `defaultValue` — Default value if not found

**Returns:** Store with value and actions

#### `createStorageStoreFromProvider(storage, key, defaultValue)`

Create storage store from a specific provider.

```typescript
function createStorageStoreFromProvider(storage: StorageProvider, key: string, defaultValue?: T): StorageStore<T>
```

- `storage` — Storage provider
- `key` — Storage key
- `defaultValue` — Default value

**Returns:** Store with value and actions

#### `createStoreAction(store, action)`

Create a bound action for a store.

```typescript
function createStoreAction(store: MoleculeStore<T>, action: (setState: MoleculeStore<T>["setState"], getState: MoleculeStore<T>["getState"]) => (...args: Args) => R): (...args: Args) => R
```

- `store` — The store
- `action` — Action creator function

**Returns:** Bound action

#### `createStoreReadable(store)`

Create a readable Svelte store from a molecule store.

```typescript
function createStoreReadable(store: MoleculeStore<T>): Readable<T>
```

- `store` — The molecule store

**Returns:** Readable Svelte store

#### `createStoreSelector(store, selector)`

Create a derived Svelte store with a selector.

```typescript
function createStoreSelector(store: MoleculeStore<T>, selector: (state: T) => S): Readable<S>
```

- `store` — The molecule store
- `selector` — Selector function

**Returns:** Derived Svelte store

#### `createThemeColorsStore(theme)`

Create a derived store that returns just the theme colors.

```typescript
function createThemeColorsStore(theme: Readable<Theme>): Readable<ThemeColors>
```

- `theme` — A readable theme store (from createThemeStores or createThemeStoresFromProvider)

**Returns:** Readable store of theme colors

#### `createThemeStores()`

Create theme stores from the theme provider in context.

```typescript
function createThemeStores(): ThemeStores & { colors: Readable<Theme["colors"]>; }
```

**Returns:** Theme stores and actions

#### `createThemeStoresFromProvider(provider)`

Create theme stores from a specific theme provider.

```typescript
function createThemeStoresFromProvider(provider: ThemeProvider): ThemeStores
```

- `provider` — Theme provider

**Returns:** Theme stores and actions

#### `createVersionStores()`

Create version stores from the module-level version provider.

```typescript
function createVersionStores(): { state: Readable<VersionState>; isUpdateAvailable: Readable<boolean>; isChecking: Readable<boolean>; isServiceWorkerWaiting: Readable<boolean>; newVersion: Readable<string | undefined>; checkForUpdates: () => Promise<boolean>; applyUpdate: (options?: { force?: boolean; }) => void; dismissUpdate: () => void; startPeriodicChecks: (options?: UpdateCheckOptions) => void; stopPeriodicChecks: () => void; }
```

**Returns:** Version stores and actions

#### `createWatchStore(controller, name)`

Create a readable store that tracks a single field's value.

```typescript
function createWatchStore(controller: FormController<T>, name: K): Readable<T[K]>
```

- `controller` — Form controller
- `name` — Field name to watch

**Returns:** Readable store of the field value

#### `getAuthClient()`

Gets the auth client from Svelte context.

```typescript
function getAuthClient(): AuthClient<T>
```

**Returns:** The auth client instance.

#### `getChildLogger(name, context)`

Create a child logger with additional context.

```typescript
function getChildLogger(name: string, context: Record<string, unknown>): Logger
```

- `name` — Parent logger name
- `context` — Additional context

**Returns:** Child logger instance

#### `getHttpClient()`

Gets the HTTP client from Svelte context.

```typescript
function getHttpClient(): HttpClient
```

**Returns:** The HTTP client instance.

#### `getI18nProvider()`

Gets the i18n provider from Svelte context.

```typescript
function getI18nProvider(): I18nProvider
```

**Returns:** The i18n provider instance.

#### `getLogger(name)`

Get a logger instance.

```typescript
function getLogger(name?: string): Logger
```

- `name` — Logger name

**Returns:** Logger instance

#### `getLoggerProvider()`

Gets the logger provider from Svelte context.

```typescript
function getLoggerProvider(): LoggerProvider
```

**Returns:** The logger provider instance.

#### `getRootLogger()`

Get the root logger.

```typescript
function getRootLogger(): Logger
```

**Returns:** Root logger instance

#### `getRouter()`

Gets the router from Svelte context.

```typescript
function getRouter(): Router
```

**Returns:** The router instance.

#### `getSetStore(store)`

Get the setState function from a molecule store.

```typescript
function getSetStore(store: MoleculeStore<T>): (partial: Partial<T> | ((state: T) => Partial<T>)) => void
```

- `store` — The molecule store

**Returns:** setState function

#### `getStateProvider()`

Gets the state provider from Svelte context.

```typescript
function getStateProvider(): StateProvider
```

**Returns:** The state provider instance.

#### `getStorageProvider()`

Gets the storage provider from Svelte context.

```typescript
function getStorageProvider(): StorageProvider
```

**Returns:** The storage provider instance.

#### `getThemeProvider()`

Gets the theme provider from Svelte context.

```typescript
function getThemeProvider(): ThemeProvider
```

**Returns:** The theme provider instance.

#### `setAuthContext(client)`

Sets the auth context.

```typescript
function setAuthContext(client: AuthClient<T>): void
```

- `client` — The auth client to store in Svelte context.

#### `setHttpContext(client)`

Sets the HTTP context.

```typescript
function setHttpContext(client: HttpClient): void
```

- `client` — The HTTP client to store in Svelte context.

#### `setI18nContext(provider)`

Sets the i18n context.

```typescript
function setI18nContext(provider: I18nProvider): void
```

- `provider` — The i18n provider to store in Svelte context.

#### `setLoggerContext(provider)`

Sets the logger context.

```typescript
function setLoggerContext(provider: LoggerProvider): void
```

- `provider` — The logger provider to store in Svelte context.

#### `setMoleculeContext(config)`

Set all molecule providers in Svelte context.

Call this in your root layout/component.

```typescript
function setMoleculeContext(config: MoleculeConfig): void
```

- `config` — Provider instances to register (state, auth, theme, router, i18n, http, storage, logger).

#### `setRouterContext(router)`

Sets the router context.

```typescript
function setRouterContext(router: Router): void
```

- `router` — The router instance to store in Svelte context.

#### `setStateContext(provider)`

Sets the state context.

```typescript
function setStateContext(provider: StateProvider): void
```

- `provider` — The state provider to store in Svelte context.

#### `setStorageContext(provider)`

Sets the storage context.

```typescript
function setStorageContext(provider: StorageProvider): void
```

- `provider` — The storage provider to store in Svelte context.

#### `setThemeContext(provider)`

Sets the theme context.

```typescript
function setThemeContext(provider: ThemeProvider): void
```

- `provider` — The theme provider to store in Svelte context.

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
- `svelte` ^4.0.0 || ^5.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-svelte`.
