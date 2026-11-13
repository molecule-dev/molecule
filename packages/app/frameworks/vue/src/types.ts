/**
 * Vue-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { ComputedRef, Ref } from 'vue'

import type { AuthClient, AuthState, RegisterExtraShape } from '@molecule/app-auth'
import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import type { FormController, FormOptions } from '@molecule/app-forms'
import type { HttpClient, RequestConfig } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { PanelId, WorkspaceLayout } from '@molecule/app-ide'
import type { DeviceFrame, PreviewState } from '@molecule/app-live-preview'
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
 * Return type for useAuth composable.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `register()` is typed like the
 *   client's.
 */
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
 * Return type for the useAuth composable.
 */
export interface UseAuthReturn<
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
 * Return type for useTheme composable.
 */
export interface UseThemeReturn {
  theme: ComputedRef<Theme>
  themeName: ComputedRef<string>
  mode: ComputedRef<'light' | 'dark'>
  setTheme: (name: string) => void
  toggleTheme: () => void
}

/**
 * Return type for useRouter composable.
 */
export interface UseRouterReturn {
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
 * Return type for useTranslation composable.
 */
export interface UseTranslationReturn {
  t: I18nProvider['t']
  locale: ComputedRef<string>
  direction: ComputedRef<'ltr' | 'rtl'>
  locales: ComputedRef<ReturnType<I18nProvider['getLocales']>>
  setLocale: I18nProvider['setLocale']
  formatNumber: I18nProvider['formatNumber']
  formatDate: I18nProvider['formatDate']
}

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
export interface UseHttpReturn<T> extends UseHttpState<T> {
  execute: () => Promise<T | null>
  reset: () => void
}

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
export interface UseStorageValueReturn<T> {
  value: Ref<T | undefined>
  loading: Ref<boolean>
  error: Ref<Error | null>
  setValue: (value: T) => Promise<void>
  removeValue: () => Promise<void>
}

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
export interface UseStoragePreferenceReturn<T> {
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
 * What {@link useOptimisticValue} returns: the state to render and the two ways to change it.
 */
export interface UseOptimisticValueReturn<T> {
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
 * Return type for useWorkspace composable.
 */
export interface UseWorkspaceReturn {
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
 * Return type for useEditor composable.
 */
export interface UseEditorReturn {
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
 * Return type for usePreview composable.
 */
export interface UsePreviewReturn {
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

// Re-export core types for convenience
export type {
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  HttpClient,
  I18nProvider,
  LoggerProvider,
  Router,
  RouterConfig,
  StateProvider,
  StorageProvider,
  Store,
  StoreConfig,
  Theme,
  ThemeProvider,
}
