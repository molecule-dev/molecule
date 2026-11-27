/**
 * Vue-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Component, ComputedRef, Ref, VNode } from 'vue'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState, RegisterExtraShape } from '@molecule/app-auth'
import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import type { FormController, FormOptions, FormResetOptions } from '@molecule/app-forms'
import type { HttpClient, RequestConfig } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { PanelId, WorkspaceLayout, WorkspaceProvider } from '@molecule/app-ide'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import type { LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, RouteParams, Router, RouterConfig } from '@molecule/app-routing'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Options for useStore composable.
 */
export interface UseStoreOptions<T, S> {
  /** Derives the subscribed value from the whole state. */
  selector?: (state: T) => S
  /**
   * Decides whether a newly selected value differs from the previous one; an
   * equal value keeps the previous snapshot. Without a selector, whole states
   * are compared.
   */
  equalityFn?: (previous: S, next: S) => boolean
}

/**
 * Options for useStore that pick part of the store: a selector is required,
 * so the selected type `S` always comes from it.
 */
export interface SelectingStoreOptions<T, S> extends UseStoreOptions<T, S> {
  /** Picks the value the composable returns from the store's state. */
  selector: (state: T) => S
}

/**
 * Options for useAuth composable.
 */
export interface UseAuthOptions {
  /**
   * Whether to probe the session with one `refresh` on mount while signed out
   * and not loading (the token may have expired since the last visit).
   */
  autoRefresh?: boolean
}

/**
 * The `SessionReady` component's slots. React passes these nodes as the
 * `children` and `fallback` props; a Vue component takes nodes as slots, so
 * they are its `default` and `fallback` slots.
 */
export interface SessionReadyProps {
  /** What renders once the initial restore settles — signed in, signed out, or unavailable. */
  default?: () => VNode[]
  /** What renders while the session restore is still undecided; default nothing. */
  fallback?: () => VNode[]
}

/**
 * What every provider component takes besides its service. React passes the
 * tree as `children`; a Vue component takes it as its default slot.
 */
export interface ProviderProps {
  /** The tree that reads the provided service (the default slot). */
  default?: () => VNode[]
}

/**
 * Props for the {@link StateProvider} component.
 */
export interface StateProviderProps extends ProviderProps {
  provider: StateProvider
}

/**
 * Props for the {@link AuthProvider} component.
 */
export interface AuthProviderProps<T = unknown> extends ProviderProps {
  client: AuthClient<T>
  /** Wait for initial session restoration by default. Set false for a deliberately ungated shell or synchronous SSR. */
  awaitSession?: boolean
  /** Content shown while the initial session status is loading (the `sessionFallback` slot); default nothing. */
  sessionFallback?: () => VNode[]
}

/**
 * Props for the {@link ThemeProvider} component.
 */
export interface ThemeProviderProps extends ProviderProps {
  provider: ThemeProvider
  /**
   * Not read: the theme a page starts on comes from the theme provider itself (`defaultTheme` and the
   * saved choice in `@molecule/app-theme-css-variables`), and setting one here would overwrite a
   * visitor's saved theme on every load.
   *
   * @deprecated Ignored. Pass `defaultTheme` to the theme provider (`createCSSVariablesThemeProvider({ defaultTheme })`) instead.
   */
  initialTheme?: string
}

/**
 * Props for the {@link RouterProvider} component.
 */
export interface RouterProviderProps extends ProviderProps {
  router: Router
  /**
   * The component that renders the matched child route where a layout or guard puts it (Vue
   * Router's `RouterView`), so `<RoutedView />` works under any routing bond. A routing bond
   * passes it; leave it out when the bond has no such component, and `<RoutedView />` then
   * throws an error saying so.
   */
  routedView?: Component
}

/**
 * Props for the {@link I18nProvider} component.
 */
export interface I18nProviderProps extends ProviderProps {
  provider: I18nProvider
}

/**
 * Props for the {@link HttpProvider} component.
 */
export interface HttpProviderProps extends ProviderProps {
  client: HttpClient
}

/**
 * Props for the {@link StorageProvider} component.
 */
export interface StorageProviderProps extends ProviderProps {
  provider: StorageProvider
}

/**
 * Props for the {@link LoggerProvider} component.
 */
export interface LoggerProviderProps extends ProviderProps {
  provider: LoggerProvider
}

/**
 * Props for the {@link WorkspaceProvider} component.
 */
export interface WorkspaceProviderProps extends ProviderProps {
  provider: WorkspaceProvider
}

/**
 * Props for the {@link EditorProvider} component.
 */
export interface EditorProviderProps extends ProviderProps {
  provider: EditorProvider
}

/**
 * Props for the {@link PreviewProvider} component.
 */
export interface PreviewProviderProps extends ProviderProps {
  provider: PreviewProvider
}

/**
 * Props for the {@link MoleculeProvider} component: each service is optional,
 * and only the services passed are provided (`state` falls back to the bonded
 * state provider).
 */
export interface MoleculeProviderProps extends ProviderProps {
  state?: StateProvider
  auth?: AuthClient<unknown>
  /**
   * Render the app only once `auth` leaves its initial loading status ({@link SessionReadyProps}). Defaults to true.
   * With the bundled JWT client, a stored token AND cached user restore synchronously.
   * Token-only and cookie-only sessions need an asynchronous current-user request;
   * until it answers `useAuth().user.value` is `null` — a public page's signed-in action
   * (`if (!user.value) return`, a redirect to `/login`) then treats a signed-in visitor as signed out.
   * When restoration succeeds, every page's first render reads the restored user. An
   * `'unavailable'` session also renders, but remains unconfirmed and may have a null user.
   * A visitor with no session candidate settles synchronously without a request.
   * Ignored without `auth`.
   */
  awaitSession?: boolean
  /** Rendered instead of the app while {@link MoleculeProviderProps.awaitSession} waits (the `sessionFallback` slot); default nothing. */
  sessionFallback?: () => VNode[]
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
  chat?: ChatProvider
  workspace?: WorkspaceProvider
  editor?: EditorProvider
  preview?: PreviewProvider
}

/**
 * Return type for the useAuth composable.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `register()` is typed like the
 *   client's.
 */
export interface UseAuthResult<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /**
   * The session's state as one value — render from this instead of combining
   * `initialized`/`authenticated`/`loading`. Only `'loading'` means "no decision
   * yet", so `SessionReady` waits on that and nothing else. `'unavailable'` keeps
   * a session candidate for retry and can have a null profile; redirect only on
   * `'unauthenticated'`.
   */
  status: ComputedRef<AuthState<T>['status']>
  state: ComputedRef<AuthState<T>>
  user: ComputedRef<T | null>
  isAuthenticated: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T, TRegister>['register']
  refresh: AuthClient<T>['refresh']
  /** Save through the configured auth transport and persist/publish its canonical profile. */
  updateProfile: AuthClient<T>['updateProfile']
  /** Cache a profile without signing in. */
  setUser: AuthClient<T>['setUser']
  /**
   * Adopt a session an exchange outside the client already established (an
   * OAuth code→token redirect, the app's own sign-in endpoint) in ONE update:
   * the token and user are stored and every consumer sees the client as
   * `authenticated` immediately.
   *
   * `setUser` alone does NOT sign the client in, and `setAccessToken` changes
   * storage only — using those two for a caller-issued session leaves every
   * `authenticated` read signed out.
   */
  setSession: AuthClient<T>['setSession']
}

/**
 * The former name of {@link UseAuthResult}.
 *
 * @deprecated Renamed to {@link UseAuthResult}, `@molecule/app-react`'s name for it.
 */
export type UseAuthReturn<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> = UseAuthResult<T, TRegister>

/**
 * Return type for useTheme composable.
 */
export interface UseThemeResult {
  theme: ComputedRef<Theme>
  themeName: ComputedRef<string>
  mode: ComputedRef<'light' | 'dark'>
  setTheme: (name: string) => void
  toggleTheme: () => void
}

/**
 * The former name of {@link UseThemeResult}.
 *
 * @deprecated Renamed to {@link UseThemeResult}, `@molecule/app-react`'s name for it.
 */
export type UseThemeReturn = UseThemeResult

/**
 * Return type for useRouter composable.
 */
export interface UseRouterResult {
  location: ComputedRef<ReturnType<Router['getLocation']>>
  params: ComputedRef<RouteParams>
  query: ComputedRef<QueryParams>
  navigate: Router['navigate']
  navigateTo: Router['navigateTo']
  back: Router['back']
  forward: Router['forward']
  isActive: Router['isActive']
}

/**
 * The former name of {@link UseRouterResult}.
 *
 * @deprecated Renamed to {@link UseRouterResult}, `@molecule/app-react`'s name for it.
 */
export type UseRouterReturn = UseRouterResult

/**
 * Return type for useTranslation composable.
 */
export interface UseTranslationResult {
  t: I18nProvider['t']
  locale: ComputedRef<string>
  direction: ComputedRef<'ltr' | 'rtl'>
  locales: ComputedRef<ReturnType<I18nProvider['getLocales']>>
  setLocale: I18nProvider['setLocale']
  formatNumber: I18nProvider['formatNumber']
  formatDate: I18nProvider['formatDate']
}

/**
 * The former name of {@link UseTranslationResult}.
 *
 * @deprecated Renamed to {@link UseTranslationResult}, `@molecule/app-react`'s name for it.
 */
export type UseTranslationReturn = UseTranslationResult

/**
 * State for async HTTP operations.
 */
export interface UseHttpState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
}

/**
 * Return type for useHttp composable.
 */
export interface UseHttpResult<T> extends UseHttpState<T> {
  execute: () => Promise<T | null>
  reset: () => void
}

/**
 * The former name of {@link UseHttpResult}.
 *
 * @deprecated Renamed to {@link UseHttpResult}, `@molecule/app-react`'s name for it.
 */
export type UseHttpReturn<T> = UseHttpResult<T>

/**
 * Options for useHttp composable: every request option, plus the hook's own.
 *
 * Request options (headers, params, body `data`) travel with the request;
 * `immediate` is read on mount only, and the callbacks fire for every
 * request's own outcome, superseded or not.
 */
export interface UseHttpOptions<T> extends RequestConfig {
  /** Whether to execute the request immediately on mount (once per host). */
  immediate?: boolean
  /** Reports each request that succeeds, superseded or not. */
  onSuccess?: (data: T) => void
  /** Reports each request that fails, superseded or not. */
  onError?: (error: Error) => void
}

/**
 * Return type for useStorageValue composable.
 */
export interface UseStorageValueResult<T> {
  value: Ref<T | undefined>
  loading: Ref<boolean>
  error: Ref<Error | null>
  setValue: (value: T) => Promise<void>
  removeValue: () => Promise<void>
}

/**
 * The former name of {@link UseStorageValueResult}.
 *
 * @deprecated Renamed to {@link UseStorageValueResult}, `@molecule/app-react`'s name for it.
 */
export type UseStorageValueReturn<T> = UseStorageValueResult<T>

/**
 * Options for useStoragePreference composable.
 */
export interface UseStoragePreferenceOptions<T> {
  /**
   * Value reported until the provider supplies one. It is NEVER written to
   * storage: a default is a display fallback, not a decision the user made.
   */
  defaultValue?: T
}

/**
 * Return type for useStoragePreference composable.
 */
export interface UseStoragePreferenceResult<T> {
  /** The persisted value, or `defaultValue` while none is known. */
  value: Ref<T | undefined>
  /**
   * Writes the value through the preference store: subscribers update
   * immediately and persistence is best-effort.
   */
  setValue: (next: T | ((previous: T | undefined) => T)) => void
  /** Removes the key through the preference store. */
  removeValue: () => void
  /**
   * `true` once the store has a definite answer — the synchronous snapshot on
   * a synchronous provider, or the hydration result on an asynchronous one.
   */
  ready: Ref<boolean>
}

/**
 * The former name of {@link UseStoragePreferenceResult}.
 *
 * @deprecated Renamed to {@link UseStoragePreferenceResult}, `@molecule/app-react`'s name for it.
 */
export type UseStoragePreferenceReturn<T> = UseStoragePreferenceResult<T>

/** Options for {@link useOptimisticToggle}. */
export interface UseOptimisticToggleOptions {
  /** The loaded server value. Mount the control only after its record exists. */
  value: boolean
  /** Saves the DESIRED value and returns the server-confirmed value; reject on failure. */
  commit: (desired: boolean) => Promise<boolean>
  /** Receives the newest failed save and the confirmed value restored by the controller. */
  onError?: (error: unknown, value: boolean) => void
}

/** What {@link useOptimisticToggle} returns: the boolean to render and an argument-free action. */
export interface UseOptimisticToggleResult {
  /** The newest value the person chose, or the server's value when nothing is being saved. */
  value: Ref<boolean>
  /** Whether a save is running or waiting to run. */
  pending: Ref<boolean>
  /** The failure of the newest change, after the value went back; `null` otherwise. */
  error: Ref<unknown>
  /** Flips the value shown now and saves it; the same function for the component's life. */
  toggle: () => void
}

/**
 * The former name of {@link UseOptimisticToggleResult}.
 *
 * @deprecated Renamed to {@link UseOptimisticToggleResult}, `@molecule/app-react`'s name for it.
 */
export type UseOptimisticToggleReturn = UseOptimisticToggleResult

/**
 * What {@link useOptimisticValue} returns: the state to render and the two ways to change it.
 */
export interface UseOptimisticValueResult<T> {
  /** The newest value the person chose, or the server's value when nothing is being saved. */
  value: Ref<T>
  /** Whether a save is running or waiting to run. */
  pending: Ref<boolean>
  /** The failure of the newest change, after the value went back; `null` otherwise. */
  error: Ref<unknown>
  /**
   * Shows `next` at once and saves it, after any save already running.
   *
   * @param next - The value the person chose.
   */
  set: (next: T) => void
  /**
   * Like `set`, computed from the value shown now (`update((on) => !on)`).
   *
   * @param change - Computes the next value from the value shown now.
   */
  update: (change: (current: T) => T) => void
}

/**
 * The former name of {@link UseOptimisticValueResult}.
 *
 * @deprecated Renamed to {@link UseOptimisticValueResult}, `@molecule/app-react`'s name for it.
 */
export type UseOptimisticValueReturn<T> = UseOptimisticValueResult<T>

/**
 * Return type for useWorkspace composable.
 */
export interface UseWorkspaceResult {
  /** The panel layout: the panel list and the sizes per position. */
  layout: ComputedRef<WorkspaceLayout>
  /** The panel with keyboard focus, if any. */
  activePanel: ComputedRef<PanelId | null>
  /** The panels currently collapsed. */
  collapsedPanels: ComputedRef<Set<PanelId>>
  /**
   * Shows or hides one panel.
   *
   * @param panelId - The panel to toggle.
   */
  togglePanel: (panelId: PanelId) => void
  /**
   * Rewrites one panel's size in its position.
   *
   * @param panelId - The panel to resize.
   * @param size - The new size.
   */
  resizePanel: (panelId: PanelId, size: number) => void
  /**
   * Moves keyboard focus to a panel.
   *
   * @param panelId - The panel to activate.
   */
  setActivePanel: (panelId: PanelId) => void
  /** Restores the default layout and clears the active/collapsed/fullscreen state. */
  resetLayout: () => void
}

/**
 * The former name of {@link UseWorkspaceResult}.
 *
 * @deprecated Renamed to {@link UseWorkspaceResult}, `@molecule/app-react`'s name for it.
 */
export type UseWorkspaceReturn = UseWorkspaceResult

/**
 * Return type for useEditor composable.
 */
export interface UseEditorResult {
  /** The provider's tab list, refreshed on every change event and tab action. */
  tabs: Ref<EditorTab[]>
  /** The path of the tab marked `isActive`, or `null` when none is. */
  activeFile: ComputedRef<string | null>
  /**
   * Opens a file in a tab and makes it active.
   *
   * @param file - The file to open.
   */
  openFile: (file: EditorFile) => void
  /**
   * Closes a file's tab.
   *
   * @param path - The path to close.
   */
  closeFile: (path: string) => void
  /** The active tab's content, or `null` with no active tab. */
  getContent: () => string | null
  /**
   * Writes a tab's content and marks it dirty.
   *
   * @param path - The tab's path.
   * @param content - The new content.
   */
  setContent: (path: string, content: string) => void
  /**
   * Activates a tab by path.
   *
   * @param path - The tab to activate.
   */
  setActiveTab: (path: string) => void
  /** Mounts the editor into a DOM element with the given config. */
  mount: EditorProvider['mount']
  /** Disposes the editor. */
  dispose: () => void
  /** Focuses the editor. */
  focus: () => void
  /**
   * Opens a diff tab for a file.
   *
   * @param file - The original and modified content to compare.
   */
  openDiff: (file: DiffFile) => void
  /** Closes any open diff tab. */
  closeDiff: () => void
  /**
   * Converts a preview tab into a normal (pinned) one.
   *
   * @param path - The tab to pin.
   */
  pinTab: (path: string) => void
  /**
   * Adds an extra TypeScript declaration library.
   *
   * @param content - The declaration source.
   * @param filePath - The virtual file name it appears under.
   */
  addExtraLib: (content: string, filePath: string) => void
  /**
   * Registers a Fix-with-AI request handler.
   *
   * @param callback - Called with each fix request.
   * @returns The unsubscriber.
   */
  onFixWithAI: (callback: (request: FixWithAIRequest) => void) => () => void
}

/**
 * The former name of {@link UseEditorResult}.
 *
 * @deprecated Renamed to {@link UseEditorResult}, `@molecule/app-react`'s name for it.
 */
export type UseEditorReturn = UseEditorResult

/**
 * Return type for usePreview composable.
 */
export interface UsePreviewResult {
  /** The provider's preview state (url, device, loading, connection, history flags). */
  state: ComputedRef<PreviewState>
  /**
   * Loads a new document; repeating the current url changes nothing.
   *
   * @param url - The document to load.
   */
  setUrl: (url: string) => void
  /** Reloads the current document (bumps the load nonce). */
  refresh: () => void
  /**
   * Switches the device frame.
   *
   * @param device - The frame to emulate.
   */
  setDevice: (device: DeviceFrame) => void
  /** Opens the preview url outside the app. */
  openExternal: () => void
  /**
   * Records a navigation the running preview reported, updating the displayed
   * url without a reload. Pass `isReplace` when the preview replaced its
   * current history entry, keeping the forward stack.
   *
   * @param url - The displayed url.
   * @param isReplace - `true` when the entry was replaced, not pushed.
   */
  recordNavigation: (url: string, isReplace?: boolean) => void
  /** Navigates to the previous history entry. */
  back: () => void
  /** Navigates to the next history entry. */
  forward: () => void
}

/**
 * The former name of {@link UsePreviewResult}.
 *
 * @deprecated Renamed to {@link UsePreviewResult}, `@molecule/app-react`'s name for it.
 */
export type UsePreviewReturn = UsePreviewResult

// Re-export core types for convenience. StateProvider, ThemeProvider, I18nProvider, StorageProvider and
// LoggerProvider are the provider components here, as in @molecule/app-react (providers.ts keeps a deprecated
// type alias under each name).
export type {
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  FormResetOptions,
  HttpClient,
  Router,
  RouterConfig,
  Store,
  StoreConfig,
  Theme,
}
