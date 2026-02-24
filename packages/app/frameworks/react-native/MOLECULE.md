# @molecule/app-react-native

React Native framework bindings for molecule.dev.

Re-exports all hooks from `@molecule/app-react` (which are pure React,
no DOM dependency) and adds RN-specific hooks.

## Type
`framework`

## Installation
```bash
npm install @molecule/app-react-native
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

#### `AuthProviderProps`

Props for auth provider component.

```typescript
interface AuthProviderProps<T = unknown> extends ProviderProps {
    client: AuthClient<T>;
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

#### `ChatProviderProps`

Props for the ChatProvider React component.

```typescript
interface ChatProviderProps extends ProviderProps {
    provider: ChatProvider;
}
```

#### `EditorProviderProps`

Props for editor provider component.

```typescript
interface EditorProviderProps extends ProviderProps {
    provider: EditorProvider;
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

#### `HttpProviderProps`

Props for http provider component.

```typescript
interface HttpProviderProps extends ProviderProps {
    client: HttpClient;
}
```

#### `I18nProviderProps`

Props for i18n provider component.

```typescript
interface I18nProviderProps extends ProviderProps {
    provider: I18nProvider;
}
```

#### `LoggerProviderProps`

Props for logger provider component.

```typescript
interface LoggerProviderProps extends ProviderProps {
    provider: LoggerProvider;
}
```

#### `MoleculeProviderProps`

Properties for molecule provider.

```typescript
interface MoleculeProviderProps extends ProviderProps {
    state?: StateProvider;
    auth?: AuthClient<unknown>;
    theme?: ThemeProvider;
    router?: Router;
    i18n?: I18nProvider;
    http?: HttpClient;
    storage?: StorageProvider;
    logger?: LoggerProvider;
    chat?: ChatProvider;
    workspace?: WorkspaceProvider;
    editor?: EditorProvider;
    preview?: PreviewProvider;
}
```

#### `PreviewProviderProps`

Props for preview provider component.

```typescript
interface PreviewProviderProps extends ProviderProps {
    provider: PreviewProvider;
}
```

#### `ProviderProps`

Props for provider components.

```typescript
interface ProviderProps {
    children: ReactNode;
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

#### `RouterProviderProps`

Props for router provider component.

```typescript
interface RouterProviderProps extends ProviderProps {
    router: Router;
}
```

#### `StateProviderProps`

Props for state provider component.

```typescript
interface StateProviderProps extends ProviderProps {
    provider: StateProvider;
}
```

#### `StorageProviderProps`

Props for storage provider component.

```typescript
interface StorageProviderProps extends ProviderProps {
    provider: StorageProvider;
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

#### `ThemeProviderProps`

Props for theme provider component.

```typescript
interface ThemeProviderProps extends ProviderProps {
    provider: ThemeProvider;
    initialTheme?: string;
}
```

#### `UseAppStateResult`

Result from the useAppState hook.

```typescript
interface UseAppStateResult {
  /** Current app state: 'active' | 'background' | 'inactive' */
  appState: string
  /** Whether the app is in the foreground */
  isActive: boolean
}
```

#### `UseAuthOptions`

Hook options for useAuth.

```typescript
interface UseAuthOptions {
    /**
     * Whether to automatically refresh the token on mount.
     */
    autoRefresh?: boolean;
}
```

#### `UseAuthResult`

Hook result for useAuth.

```typescript
interface UseAuthResult<T = unknown> {
    state: AuthState<T>;
    login: AuthClient<T>['login'];
    logout: AuthClient<T>['logout'];
    register: AuthClient<T>['register'];
    refresh: AuthClient<T>['refresh'];
    isAuthenticated: boolean;
    isLoading: boolean;
    user: T | null;
}
```

#### `UseBackHandlerOptions`

Options for the useBackHandler hook.

```typescript
interface UseBackHandlerOptions {
  /** Whether the handler is enabled. Defaults to true. */
  enabled?: boolean
}
```

#### `UseChangePasswordReturn`

Return type for useChangePassword hook.

```typescript
interface UseChangePasswordReturn {
    status: UsePromiseState<void>['status'];
    error: UsePromiseState<void>['error'];
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    reset: () => void;
}
```

#### `UseChatOptions`

Hook options for useChat.

```typescript
interface UseChatOptions {
    /** Chat endpoint (e.g., '/projects/123/chat'). */
    endpoint: string;
    /** Project ID for context. */
    projectId?: string;
    /** Load history on mount. */
    loadOnMount?: boolean;
}
```

#### `UseChatResult`

Hook result for useChat.

```typescript
interface UseChatResult {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (message: string) => Promise<void>;
    abort: () => void;
    clearHistory: () => Promise<void>;
}
```

#### `UseDeviceResult`

Hook return type.

```typescript
interface UseDeviceResult {
    deviceInfo: DeviceInfo;
    screenInfo: ScreenInfo;
    hardwareInfo: HardwareInfo;
    featureSupport: FeatureSupport;
    supports: (feature: keyof FeatureSupport) => boolean;
    isOnline: () => boolean;
    isStandalone: () => boolean;
    language: string;
    languages: string[];
}
```

#### `UseEditorResult`

Hook result for useEditor.

```typescript
interface UseEditorResult {
    tabs: EditorTab[];
    activeFile: string | null;
    openFile: (file: EditorFile) => void;
    closeFile: (path: string) => void;
    getContent: () => string | null;
    setContent: (path: string, content: string) => void;
    setActiveTab: (path: string) => void;
    mount: EditorProvider['mount'];
    dispose: () => void;
    focus: () => void;
}
```

#### `UseFormOptions`

Options for useForm hook.

```typescript
interface UseFormOptions<T extends Record<string, unknown>> extends FormOptions<T> {
    /**
     * Form provider's createForm function.
     */
    createForm: (options: FormOptions<T>) => FormController<T>;
}
```

#### `UseFormResult`

Result of useForm hook.

```typescript
interface UseFormResult<T extends Record<string, unknown>> {
    formState: FormState<T>;
    isValid: boolean;
    isDirty: boolean;
    isSubmitting: boolean;
    register: (name: keyof T, options?: RegisterOptions) => FieldRegistration;
    getValue: <K extends keyof T>(name: K) => T[K];
    setValue: <K extends keyof T>(name: K, value: T[K]) => void;
    getError: (name: keyof T) => string | undefined;
    setError: (name: keyof T, error: string | undefined) => void;
    clearErrors: () => void;
    handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (event?: React.FormEvent) => void;
    reset: (values?: Partial<T>) => void;
    validate: () => Promise<boolean>;
}
```

#### `UseHttpOptions`

Options for useHttp hook.

```typescript
interface UseHttpOptions<T> extends RequestConfig {
    /**
     * Whether to execute the request immediately on mount.
     */
    immediate?: boolean;
    /**
     * Callback when request succeeds.
     */
    onSuccess?: (data: T) => void;
    /**
     * Callback when request fails.
     */
    onError?: (error: Error) => void;
}
```

#### `UseHttpResult`

Result of useHttp hook.

```typescript
interface UseHttpResult<T> extends UseHttpState<T> {
    execute: () => Promise<T | null>;
    reset: () => void;
}
```

#### `UseHttpState`

State for async HTTP operations.

```typescript
interface UseHttpState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}
```

#### `UseKeyboardHeightResult`

Result from the useKeyboardHeight hook.

```typescript
interface UseKeyboardHeightResult {
  /** Current keyboard height in points (0 when hidden) */
  keyboardHeight: number
  /** Whether the keyboard is currently visible */
  isKeyboardVisible: boolean
}
```

#### `UseLoginReturn`

Return type for useLogin hook.

```typescript
interface UseLoginReturn<T = unknown> {
    status: UsePromiseState<AuthResult<T>>['status'];
    value: UsePromiseState<AuthResult<T>>['value'];
    error: UsePromiseState<AuthResult<T>>['error'];
    login: (credentials: LoginCredentials) => Promise<AuthResult<T>>;
    reset: () => void;
}
```

#### `UseOAuthReturn`

Return type for useOAuth hook.

```typescript
interface UseOAuthReturn {
    providers: string[];
    getOAuthUrl: (provider: string) => string;
    redirect: (provider: string) => void;
}
```

#### `UsePasswordResetReturn`

Return type for usePasswordReset hook.

```typescript
interface UsePasswordResetReturn {
    requestStatus: UsePromiseState<void>['status'];
    requestError: UsePromiseState<void>['error'];
    confirmStatus: UsePromiseState<void>['status'];
    confirmError: UsePromiseState<void>['error'];
    requestReset: (data: PasswordResetRequest) => Promise<void>;
    confirmReset: (data: PasswordResetConfirm) => Promise<void>;
    reset: () => void;
}
```

#### `UsePlatformResult`

Hook return type.

```typescript
interface UsePlatformResult {
    platform: Platform;
    isNative: boolean;
    isMobile: boolean;
    isDesktop: boolean;
    isWeb: boolean;
    isDevelopment: boolean;
    isProduction: boolean;
    isPlatform: (...platforms: Platform[]) => boolean;
}
```

#### `UsePreviewResult`

Hook result for usePreview.

```typescript
interface UsePreviewResult {
    state: PreviewState;
    setUrl: (url: string) => void;
    refresh: () => void;
    setDevice: (device: DeviceFrame) => void;
    openExternal: () => void;
}
```

#### `UsePromiseState`

Extended promise state with actions.

```typescript
interface UsePromiseState<T> {
    status: PromiseStatus;
    value: T | null;
    error: Error | null;
    cancel: (message?: string) => void;
    reset: () => void;
}
```

#### `UsePushOptions`

Options for the usePush hook (e.g. check permission on mount).

```typescript
interface UsePushOptions {
    /**
     * Whether to check permission status on mount.
     */
    checkOnMount?: boolean;
}
```

#### `UsePushResult`

Hook return type.

```typescript
interface UsePushResult {
    permission: PermissionStatus | null;
    token: PushToken | null;
    checkPermission: () => Promise<PermissionStatus>;
    requestPermission: () => Promise<PermissionStatus>;
    register: () => Promise<PushToken>;
    unregister: () => Promise<void>;
    onNotificationReceived: (listener: NotificationReceivedListener) => () => void;
    onNotificationAction: (listener: NotificationActionListener) => () => void;
    onTokenChange: (listener: TokenChangeListener) => () => void;
    setBadge: (count: number) => Promise<void>;
    clearBadge: () => Promise<void>;
}
```

#### `UseRouterResult`

Hook result for useRouter.

```typescript
interface UseRouterResult {
    location: Router['getLocation'] extends () => infer R ? R : never;
    params: Record<string, string>;
    query: QueryParams;
    navigate: Router['navigate'];
    navigateTo: Router['navigateTo'];
    back: Router['back'];
    forward: Router['forward'];
    isActive: Router['isActive'];
}
```

#### `UseSignupReturn`

Return type for useSignup hook.

```typescript
interface UseSignupReturn<T = unknown> {
    status: UsePromiseState<AuthResult<T>>['status'];
    value: UsePromiseState<AuthResult<T>>['value'];
    error: UsePromiseState<AuthResult<T>>['error'];
    signup: (data: RegisterData) => Promise<AuthResult<T>>;
    reset: () => void;
}
```

#### `UseStorageValueOptions`

Options for useStorageValue hook.

```typescript
interface UseStorageValueOptions<T> {
    /**
     * Default value if key doesn't exist.
     */
    defaultValue?: T;
    /**
     * Whether to sync across tabs/windows (if supported by storage provider).
     */
    sync?: boolean;
}
```

#### `UseStorageValueResult`

Result of useStorageValue hook.

```typescript
interface UseStorageValueResult<T> {
    value: T | undefined;
    setValue: (value: T) => Promise<void>;
    removeValue: () => Promise<void>;
    loading: boolean;
    error: Error | null;
}
```

#### `UseStoreOptions`

Hook options for useStore.

```typescript
interface UseStoreOptions<T, S> {
    selector?: (state: T) => S;
    equalityFn?: (a: S, b: S) => boolean;
}
```

#### `UseThemeResult`

Hook result for useTheme.

```typescript
interface UseThemeResult {
    theme: Theme;
    themeName: string;
    setTheme: (name: string) => void;
    toggleTheme: () => void;
    mode: 'light' | 'dark';
}
```

#### `UseTranslationResult`

Hook result for useTranslation.

```typescript
interface UseTranslationResult {
    t: I18nProvider['t'];
    locale: string;
    setLocale: I18nProvider['setLocale'];
    locales: ReturnType<I18nProvider['getLocales']>;
    formatNumber: I18nProvider['formatNumber'];
    formatDate: I18nProvider['formatDate'];
    direction: 'ltr' | 'rtl';
}
```

#### `UseVersionResult`

Hook return type.

```typescript
interface UseVersionResult {
    state: VersionState;
    isUpdateAvailable: boolean;
    isChecking: boolean;
    isServiceWorkerWaiting: boolean;
    newVersion: string | undefined;
    checkForUpdates: () => Promise<boolean>;
    applyUpdate: (options?: {
        force?: boolean;
    }) => void;
    dismissUpdate: () => void;
    startPeriodicChecks: (options?: UpdateCheckOptions) => void;
    stopPeriodicChecks: () => void;
}
```

#### `UseWorkspaceResult`

Hook result for useWorkspace.

```typescript
interface UseWorkspaceResult {
    layout: WorkspaceLayout;
    activePanel: PanelId | null;
    collapsedPanels: Set<PanelId>;
    togglePanel: (panelId: PanelId) => void;
    resizePanel: (panelId: PanelId, size: number) => void;
    setActivePanel: (panelId: PanelId) => void;
    resetLayout: () => void;
}
```

#### `WorkspaceProviderProps`

Props for workspace provider component.

```typescript
interface WorkspaceProviderProps extends ProviderProps {
    provider: WorkspaceProvider;
}
```

### Types

#### `AsyncExtendState`

Async-capable extendState function for partial updates.

```typescript
type AsyncExtendState<T> = (partial: Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>) => void;
```

#### `AsyncSetState`

Async-capable setState function.

```typescript
type AsyncSetState<T> = (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void;
```

#### `UseCapacitorAppResult`

Hook return type.

```typescript
type UseCapacitorAppResult = CapacitorAppState & {
    initialize: () => Promise<void>;
};
```

### Functions

#### `AuthProvider(root0, root0, root0)`

Provider for authentication.

```typescript
function AuthProvider({ client, children, }: AuthProviderProps<T>): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .client - The auth client instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered auth provider element.

#### `ChatProvider(root0, root0, root0)`

Provider for AI chat.

```typescript
function ChatProvider({ provider, children }: ChatProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The chat provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered chat provider element.

#### `EditorProvider(root0, root0, root0)`

Provider for code editor.

```typescript
function EditorProvider({ provider, children }: EditorProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The editor provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered editor provider element.

#### `HttpProvider(root0, root0, root0)`

Provider for HTTP client.

```typescript
function HttpProvider({ client, children }: HttpProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .client - The HTTP client instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered HTTP provider element.

#### `I18nProvider(root0, root0, root0)`

Provider for internationalization.

```typescript
function I18nProvider({ provider, children }: I18nProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The i18n provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered i18n provider element.

#### `LoggerProvider(root0, root0, root0)`

Provider for logging.

```typescript
function LoggerProvider({ provider, children }: LoggerProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The logger provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered logger provider element.

#### `MoleculeProvider(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Combined provider for all molecule services.

Provides a convenient way to wrap your app with all molecule providers at once.
Only providers that are passed will be included.

```typescript
function MoleculeProvider({ children, state, auth, theme, router, i18n, http, storage, logger, chat, workspace, editor, preview, }: MoleculeProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .children - The child elements to render.
- `root0` — .state - Optional state provider.
- `root0` — .auth - Optional auth client.
- `root0` — .theme - Optional theme provider.
- `root0` — .router - Optional router instance.
- `root0` — .i18n - Optional i18n provider.
- `root0` — .http - Optional HTTP client.
- `root0` — .storage - Optional storage provider.
- `root0` — .logger - Optional logger provider.
- `root0` — .chat - Optional chat provider.
- `root0` — .workspace - Optional workspace provider.
- `root0` — .editor - Optional editor provider.
- `root0` — .preview - Optional preview provider.

**Returns:** The rendered combined provider element.

#### `PreviewProvider(root0, root0, root0)`

Provider for live preview.

```typescript
function PreviewProvider({ provider, children }: PreviewProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The preview provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered preview provider element.

#### `RouterProvider(root0, root0, root0)`

Provider for routing.

```typescript
function RouterProvider({ router, children }: RouterProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .router - The router instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered router provider element.

#### `StateProvider(root0, root0, root0)`

Provider for state management.

```typescript
function StateProvider({ provider, children }: StateProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The state provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered state provider element.

#### `StorageProvider(root0, root0, root0)`

Provider for storage.

```typescript
function StorageProvider({ provider, children }: StorageProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The storage provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered storage provider element.

#### `ThemeProvider(root0, root0, root0)`

Provider for theming.

```typescript
function ThemeProvider({ provider, children }: ThemeProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The theme provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered theme provider element.

#### `useAppState()`

Tracks whether the app is in the foreground, background, or inactive.

Uses React Native's `AppState` API under the hood. Falls back to
'active' on platforms where AppState is unavailable.

```typescript
function useAppState(): UseAppStateResult
```

**Returns:** Current app state and whether the app is active.

#### `useAuth(options)`

Hook for authentication state and actions.

```typescript
function useAuth(options?: UseAuthOptions): UseAuthResult<T>
```

- `options` — Hook options

**Returns:** Auth state and action methods

#### `useAuthClient()`

Hook to access the auth client from context.

```typescript
function useAuthClient(): AuthClient<T>
```

**Returns:** The auth client from context

#### `useBackHandler(handler, options)`

Registers a handler for the Android hardware back button.

Return `true` from the handler to prevent the default back behavior,
or `false` to allow it.

```typescript
function useBackHandler(handler: () => boolean, options?: UseBackHandlerOptions): void
```

- `handler` — Callback invoked when the hardware back button is pressed.
- `options` — Optional configuration.

#### `useCapacitorApp(options)`

Hook for Capacitor app initialization and state management.

Creates a `CapacitorApp` coordinator on mount, subscribes to state changes,
and auto-initializes. Cleans up listeners on unmount via `destroy()`.

```typescript
function useCapacitorApp(options?: CapacitorAppOptions): UseCapacitorAppResult
```

- `options` — Capacitor app configuration options

**Returns:** Current app state and an `initialize` function for manual re-initialization

#### `useChangePassword()`

Hook for changing password with async state tracking.

```typescript
function useChangePassword(): UseChangePasswordReturn
```

**Returns:** Change password state and action

#### `useChat(options)`

Hook for AI chat with streaming support.

Manages message state, sends messages to the backend, and handles
SSE streaming responses.

```typescript
function useChat(options: UseChatOptions): UseChatResult
```

- `options` — Chat configuration including endpoint URL, project ID, and whether to load history on mount.

**Returns:** Chat state and controls: messages, isLoading, error, sendMessage, abort, and clearHistory.

#### `useChatProvider()`

Access the chat provider from context.

```typescript
function useChatProvider(): ChatProvider
```

**Returns:** The ChatProvider instance from the nearest ChatContext.

#### `useChildLogger(parentName, context)`

Hook to create a child logger with additional context.

```typescript
function useChildLogger(parentName: string, context: Record<string, unknown>): Logger
```

- `parentName` — Parent logger name
- `context` — Additional context to include in logs

**Returns:** Child logger instance

#### `useCurrentTheme()`

Hook to get just the current theme object.

```typescript
function useCurrentTheme(): Theme
```

**Returns:** The current theme

#### `useDelete(url, options)`

Hook for DELETE requests.

```typescript
function useDelete(url: string, options?: UseHttpOptions<T>): UseHttpResult<T>
```

- `url` — Request URL of the resource to delete.
- `options` — HTTP request options including callbacks.

**Returns:** Request state (data, loading, error) and controls (execute, reset).

#### `useDevice()`

Hook for device information.

Uses module-level `getProvider()` — device info is a singleton, not context-provided.
Device info is static and doesn't change at runtime, so this uses `useMemo`.

```typescript
function useDevice(): UseDeviceResult
```

**Returns:** Device information and utility methods

#### `useDirection()`

Hook to get the text direction.

```typescript
function useDirection(): "ltr" | "rtl"
```

**Returns:** The text direction ('ltr' or 'rtl')

#### `useEditor()`

Hook for code editor management.

```typescript
function useEditor(): UseEditorResult
```

**Returns:** Editor state and controls: tabs, activeFile, openFile, closeFile, getContent, setContent, setActiveTab, mount, dispose, and focus.

#### `useEditorProvider()`

Access the editor provider from context.

```typescript
function useEditorProvider(): EditorProvider
```

**Returns:** The EditorProvider instance from the nearest EditorContext.

#### `useFieldState(form, name)`

Hook to get field-level state.

```typescript
function useFieldState(form: FormController<T>, name: keyof T): FieldState<T[keyof T]>
```

- `form` — Form controller
- `name` — Field name

**Returns:** Field state (value, error, touched, dirty, valid)

#### `useForm(options)`

Hook for form state management.

```typescript
function useForm(options: UseFormOptions<T>): UseFormResult<T>
```

- `options` — Form options including createForm from a forms provider

**Returns:** Form state and methods

#### `useGet(url, options)`

Hook for GET requests.

```typescript
function useGet(url: string, options?: UseHttpOptions<T>): UseHttpResult<T>
```

- `url` — Request URL to fetch from.
- `options` — HTTP request options including callbacks and request config.

**Returns:** Request state (data, loading, error) and controls (execute, reset).

#### `useHttp(method, url, options)`

Hook for making HTTP requests with state management.

```typescript
function useHttp(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, options?: UseHttpOptions<T>): UseHttpResult<T>
```

- `method` — HTTP method
- `url` — Request URL
- `options` — Request options

**Returns:** Request state and execute function

#### `useHttpClient()`

Hook to access the HTTP client from context.

```typescript
function useHttpClient(): HttpClient
```

**Returns:** The HTTP client from context

#### `useI18nProvider()`

Hook to access the i18n provider from context.

```typescript
function useI18nProvider(): I18nProvider
```

**Returns:** The i18n provider from context

#### `useIsActive(path, exact)`

Hook to check if a path is active.

```typescript
function useIsActive(path: string, exact?: boolean): boolean
```

- `path` — The path to check
- `exact` — Whether to match exactly (default: false)

**Returns:** Whether the path is active

#### `useIsAuthenticated()`

Hook to check if user is authenticated.

```typescript
function useIsAuthenticated(): boolean
```

**Returns:** Whether the user is authenticated

#### `useKeyboardHeight()`

Tracks soft keyboard visibility and height.

Uses React Native's `Keyboard` API. Falls back to hidden state
on platforms where Keyboard is unavailable.

```typescript
function useKeyboardHeight(): UseKeyboardHeightResult
```

**Returns:** Current keyboard height and visibility state.

#### `useLocale()`

Hook to get the current locale.

```typescript
function useLocale(): string
```

**Returns:** The current locale code

#### `useLocation()`

Hook to get the current location.

```typescript
function useLocation(): RouteLocation
```

**Returns:** The current route location

#### `useLogger(name, config)`

Hook to get a logger instance.

```typescript
function useLogger(name: string, config?: Partial<LoggerConfig>): Logger
```

- `name` — Logger name (usually component or module name)
- `config` — Optional logger configuration

**Returns:** Logger instance

#### `useLoggerProvider()`

Hook to access the logger provider from context.

```typescript
function useLoggerProvider(): LoggerProvider
```

**Returns:** The logger provider from context

#### `useLogin()`

Hook for login with async state tracking.

```typescript
function useLogin(): UseLoginReturn<T>
```

**Returns:** Login state and action

#### `useNavigate()`

Hook to get the navigate function.

```typescript
function useNavigate(): (path: string, options?: NavigateOptions) => void
```

**Returns:** The navigate function

#### `useOAuth(config, config, config, config)`

Hook for OAuth authentication.

Reads OAuth configuration from the provided config and provides
helpers to build OAuth URLs and redirect to providers.

```typescript
function useOAuth(config?: { baseURL?: string; oauthProviders?: string[]; oauthEndpoint?: string; }): UseOAuthReturn
```

- `config` — Optional OAuth configuration override.
- `config` — .baseURL - Base URL for the API server (e.g. "https://api.example.com").
- `config` — .oauthProviders - List of supported OAuth provider names (e.g. ["google", "github"]).
- `config` — .oauthEndpoint - Path prefix for OAuth routes (defaults to "/oauth").

**Returns:** OAuth helpers: available providers list, getOAuthUrl builder, and redirect function.

#### `useParams()`

Hook to get route parameters.

```typescript
function useParams(): T
```

**Returns:** The current route parameters

#### `usePasswordReset()`

Hook for password reset flow with async state tracking.

Provides separate tracking for the request and confirm steps.

```typescript
function usePasswordReset(): UsePasswordResetReturn
```

**Returns:** Password reset state and actions

#### `usePatch(url, options)`

Hook for PATCH requests.

```typescript
function usePatch(url: string, options?: UseHttpOptions<T>): UseHttpResult<T>
```

- `url` — Request URL to send the PATCH request to.
- `options` — HTTP request options including partial body data and callbacks.

**Returns:** Request state (data, loading, error) and controls (execute, reset).

#### `usePlatform()`

Hook for platform detection.

Uses module-level functions — platform is a singleton, not context-provided.
Platform info is static and doesn't change at runtime, so this uses `useMemo`.

```typescript
function usePlatform(): UsePlatformResult
```

**Returns:** Platform information and utility methods

#### `usePost(url, options)`

Hook for POST requests.

```typescript
function usePost(url: string, options?: UseHttpOptions<T>): UseHttpResult<T>
```

- `url` — Request URL to post to.
- `options` — HTTP request options including body data and callbacks.

**Returns:** Request state (data, loading, error) and controls (execute, reset).

#### `usePreview()`

Hook for live preview management.

```typescript
function usePreview(): UsePreviewResult
```

**Returns:** Preview state and controls: state (url, isLoading, device, error, isConnected), setUrl, refresh, setDevice, and openExternal.

#### `usePreviewProvider()`

Access the preview provider from context.

```typescript
function usePreviewProvider(): PreviewProvider
```

**Returns:** The PreviewProvider instance from the nearest PreviewContext.

#### `usePush(options)`

Hook for push notification state and actions.

Uses module-level `getProvider()` — push is a singleton, not context-provided.

```typescript
function usePush(options?: UsePushOptions): UsePushResult
```

- `options` — Hook options

**Returns:** Push notification state and action methods

#### `usePut(url, options)`

Hook for PUT requests.

```typescript
function usePut(url: string, options?: UseHttpOptions<T>): UseHttpResult<T>
```

- `url` — Request URL to send the PUT request to.
- `options` — HTTP request options including body data and callbacks.

**Returns:** Request state (data, loading, error) and controls (execute, reset).

#### `useQuery()`

Hook to get query parameters.

```typescript
function useQuery(): T
```

**Returns:** The current query parameters

#### `useRootLogger()`

Hook to get the root logger.

```typescript
function useRootLogger(): Logger
```

**Returns:** Root logger instance

#### `useRouter()`

Hook for routing state and actions.

```typescript
function useRouter(): UseRouterResult
```

**Returns:** Router state and navigation methods

#### `useRouterInstance()`

Hook to access the router from context.

```typescript
function useRouterInstance(): Router
```

**Returns:** The router from context

#### `useSafeArea()`

Returns the current safe area insets from `react-native-safe-area-context`.

Must be used within a `SafeAreaProvider`. Falls back to zero insets
if the context is unavailable.

```typescript
function useSafeArea(): SafeAreaInsets
```

**Returns:** Safe area insets for the current device.

#### `useSetStore(store)`

Hook to get the store's setState function.

```typescript
function useSetStore(store: Store<T>): (partial: Partial<T> | ((state: T) => Partial<T>)) => void
```

- `store` — The store to get setState from

**Returns:** The setState function

#### `useSignup()`

Hook for user registration with async state tracking.

```typescript
function useSignup(): UseSignupReturn<T>
```

**Returns:** Signup state and action

#### `useStateProvider()`

Hook to access the state provider from context.

```typescript
function useStateProvider(): StateProvider
```

**Returns:** The state provider from context

#### `useStorage()`

Hook for simple storage operations without React state sync.

```typescript
function useStorage(): { get: <T>(key: string) => Promise<T | null>; set: <T>(key: string, value: T) => Promise<void>; remove: (key: string) => Promise<void>; clear: () => Promise<void>; keys: () => Promise<string[]>; }
```

**Returns:** Storage operation methods

#### `useStorageProvider()`

Hook to access the storage provider from context.

```typescript
function useStorageProvider(): StorageProvider
```

**Returns:** The storage provider from context

#### `useStorageValue(key, options)`

Hook to manage a single storage value with React state sync.

```typescript
function useStorageValue(key: string, options?: UseStorageValueOptions<T>): UseStorageValueResult<T>
```

- `key` — Storage key
- `options` — Hook options

**Returns:** Storage value state (value, loading, error) and mutators (setValue, removeValue).

#### `useStore(store, options)`

Hook to subscribe to a store with optional selector and equality function.

```typescript
function useStore(store: Store<T>, options?: UseStoreOptions<T, S>): S
```

- `store` — The store to subscribe to
- `options` — Hook options (selector, equalityFn)

**Returns:** The selected state

#### `useStoreAction(store, action)`

Hook to create a bound action for a store.

```typescript
function useStoreAction(store: Store<T>, action: (setState: Store<T>["setState"], getState: Store<T>["getState"]) => (...args: Args) => R): (...args: Args) => R
```

- `store` — The store to bind to
- `action` — The action function that receives setState and getState

**Returns:** A bound action function

#### `useT()`

Hook to get just the translation function.

```typescript
function useT(): (key: string, values?: InterpolationValues) => string
```

**Returns:** The translation function

#### `useTheme()`

Hook for theme state and actions.

```typescript
function useTheme(): UseThemeResult
```

**Returns:** Theme state and actions

#### `useThemeColors()`

Hook to get theme colors.

```typescript
function useThemeColors(): ThemeColors
```

**Returns:** The current theme colors

#### `useThemeMode()`

Hook to get just the theme mode (light/dark).

```typescript
function useThemeMode(): "light" | "dark"
```

**Returns:** The current theme mode

#### `useThemeProvider()`

Hook to access the theme provider from context.

```typescript
function useThemeProvider(): ThemeProvider
```

**Returns:** The theme provider from context

#### `useTranslation()`

Hook for internationalization.

```typescript
function useTranslation(): UseTranslationResult
```

**Returns:** Translation function and locale management

#### `useUser()`

Hook to get just the authenticated user.

```typescript
function useUser(): T | null
```

**Returns:** The authenticated user or null

#### `useVersion()`

Hook for version state and update actions.

Uses module-level `getProvider()` — version is a singleton, not context-provided.

```typescript
function useVersion(): UseVersionResult
```

**Returns:** Version state and action methods

#### `useWatch(form, name)`

Hook to watch a specific field value.

```typescript
function useWatch(form: FormController<T>, name: K): T[K]
```

- `form` — Form controller
- `name` — Field name to watch

**Returns:** Current field value

#### `useWorkspace()`

Hook for IDE workspace layout management.

```typescript
function useWorkspace(): UseWorkspaceResult
```

**Returns:** The workspace state and management methods.

#### `useWorkspaceProvider()`

Access the workspace provider from context.

```typescript
function useWorkspaceProvider(): WorkspaceProvider
```

**Returns:** The result.

#### `WorkspaceProvider(root0, root0, root0)`

Provider for IDE workspace.

```typescript
function WorkspaceProvider({ provider, children, }: WorkspaceProviderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — The component props.
- `root0` — .provider - The workspace provider instance.
- `root0` — .children - The child elements to render.

**Returns:** The rendered workspace provider element.

### Constants

#### `AuthContext`

Context for authentication client.

```typescript
const AuthContext: Context<AuthClient<unknown> | null>
```

#### `ChatContext`

Context for AI chat provider.

```typescript
const ChatContext: Context<ChatProvider | null>
```

#### `EditorContext`

Context for code editor provider.

```typescript
const EditorContext: Context<EditorProvider | null>
```

#### `HttpContext`

Context for HTTP client.

```typescript
const HttpContext: Context<HttpClient | null>
```

#### `I18nContext`

Context for internationalization provider.

```typescript
const I18nContext: Context<I18nProvider | null>
```

#### `LoggerContext`

Context for logger provider.

```typescript
const LoggerContext: Context<LoggerProvider | null>
```

#### `PreviewContext`

Context for live preview provider.

```typescript
const PreviewContext: Context<PreviewProvider | null>
```

#### `RouterContext`

Context for router.

```typescript
const RouterContext: Context<Router | null>
```

#### `StateContext`

Context for state management provider.

```typescript
const StateContext: Context<StateProvider | null>
```

#### `StorageContext`

Context for storage provider.

```typescript
const StorageContext: Context<StorageProvider | null>
```

#### `ThemeContext`

Context for theme provider.

```typescript
const ThemeContext: Context<ThemeProvider | null>
```

#### `useAsyncState`

Hook like useState but accepts Promises and supports partial state extension.

```typescript
const useAsyncState: <T>(initialState: T) => [T, AsyncSetState<T>, AsyncExtendState<T>]
```

#### `usePromise`

Hook that wraps an async function with state tracking.

```typescript
const usePromise: <T extends (...args: any[]) => Promise<any>>(asyncFn: T) => [UsePromiseState<Awaited<ReturnType<T>>>, (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>]
```

#### `WorkspaceContext`

Context for IDE workspace provider.

```typescript
const WorkspaceContext: Context<WorkspaceProvider | null>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-lifecycle` ^1.0.0
- `@molecule/app-keyboard` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-native` >=0.72.0
- `react-native-safe-area-context` >=4.0.0
