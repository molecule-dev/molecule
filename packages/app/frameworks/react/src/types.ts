/**
 * React-specific types for the Molecule framework bindings.
 *
 * @module
 */

import type { ComponentType, ReactNode } from 'react'

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
import type { HttpClient } from '@molecule/app-http'
import type {
  I18nProvider,
  TranslateFunctionWithFallback,
  TranslateOptions,
} from '@molecule/app-i18n'
import type { PanelId, WorkspaceLayout, WorkspaceProvider } from '@molecule/app-ide'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import type { LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, RouteParams, Router, RouterConfig } from '@molecule/app-routing'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Props for provider components.
 */
export interface ProviderProps {
  children: ReactNode
}

/**
 * Props for the `SessionReady` component.
 */
export interface SessionReadyProps {
  /** What renders once the initial restore settles — signed in, signed out, or unavailable. */
  children: ReactNode
  /** What renders while the session restore is still undecided; default nothing. */
  fallback?: ReactNode
}

/**
 * Props for state provider component.
 */
export interface StateProviderProps extends ProviderProps {
  provider: StateProvider
}

/**
 * Props for auth provider component.
 */
export interface AuthProviderProps<T = unknown> extends ProviderProps {
  client: AuthClient<T>
  /** Wait for initial session restoration by default. Set false for a deliberately ungated shell or synchronous SSR. */
  awaitSession?: boolean
  /** Content shown while the initial session status is loading; default nothing. */
  sessionFallback?: ReactNode
}

/**
 * Props for theme provider component.
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
 * Props for router provider component.
 */
export interface RouterProviderProps extends ProviderProps {
  router: Router
  /**
   * The component that renders the matched child route where a layout or guard puts it (React
   * Router's `Outlet`), so `<RoutedView />` works under any routing bond. A routing bond passes
   * it; leave it out when the bond has no such component (Next.js gives a layout its page as
   * children), and `<RoutedView />` then throws an error saying so.
   */
  routedView?: ComponentType
  /**
   * A hook that returns the route params of the component calling it, from a routing bond whose
   * native router scopes params to the component (React Router's `useParams`, which is empty
   * above the matched route). `useRouter().params` and `useParams()` call it and fall back to
   * `router.getParams()` when it returns none. Read once, at the provider's first render: pass a
   * module-level function. Leave it out when the router answers params anywhere.
   */
  useRouteParams?: () => RouteParams
}

/**
 * Props for i18n provider component.
 */
export interface I18nProviderProps extends ProviderProps {
  provider: I18nProvider
}

/**
 * Props for http provider component.
 */
export interface HttpProviderProps extends ProviderProps {
  client: HttpClient
}

/**
 * Props for storage provider component.
 */
export interface StorageProviderProps extends ProviderProps {
  provider: StorageProvider
}

/**
 * Props for logger provider component.
 */
export interface LoggerProviderProps extends ProviderProps {
  provider: LoggerProvider
}

/**
 * Props for workspace provider component.
 */
export interface WorkspaceProviderProps extends ProviderProps {
  provider: WorkspaceProvider
}

/**
 * Props for editor provider component.
 */
export interface EditorProviderProps extends ProviderProps {
  provider: EditorProvider
}

/**
 * Props for preview provider component.
 */
export interface PreviewProviderProps extends ProviderProps {
  provider: PreviewProvider
}

/**
 * Properties for molecule provider.
 */
export interface MoleculeProviderProps extends ProviderProps {
  state?: StateProvider
  auth?: AuthClient<unknown>
  /**
   * Render the app only once `auth` leaves its initial loading status ({@link SessionReadyProps}). Defaults to true.
   * With the bundled JWT client, a stored token AND cached user restore synchronously.
   * Token-only and cookie-only sessions need an asynchronous current-user request;
   * until it answers `useAuth().user` is `null` — a public page's signed-in action
   * (`if (!user) return`, a redirect to `/login`) then treats a signed-in visitor as signed out.
   * When restoration succeeds, every page's first render reads the restored user. An
   * `'unavailable'` session also renders, but remains unconfirmed and may have a null user.
   * A visitor with no session candidate settles synchronously without a request.
   * Ignored without `auth`. Synchronous SSR renders the fallback for a loading client:
   * initialize a request-scoped client first, or set this false for an ungated SSR shell.
   */
  awaitSession?: boolean
  /** Rendered instead of the app while {@link MoleculeProviderProps.awaitSession} waits; default nothing. */
  sessionFallback?: ReactNode
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
 * Hook options for useStore.
 */
export interface UseStoreOptions<T, S> {
  selector?: (state: T) => S
  equalityFn?: (a: S, b: S) => boolean
}

/**
 * Hook options that pick part of the store: a selector is required, so the selected type `S`
 * always comes from it.
 */
export interface SelectingStoreOptions<T, S> extends UseStoreOptions<T, S> {
  /** Picks the value the hook returns from the store's state. */
  selector: (state: T) => S
}

/**
 * Hook options for useAuth.
 */
export interface UseAuthOptions {
  /**
   * Whether to automatically refresh the token on mount.
   */
  autoRefresh?: boolean
}

/**
 * Hook result for useAuth.
 *
 * @template T - The user profile the API returns (the same type passed to
 *   `createJWTAuthClient<T>` and `AuthClientConfig<T>`).
 * @template TRegister - The app's own registration fields, at the top level of
 *   `register()` — the second generic of `createJWTAuthClient<T, TRegister>`,
 *   so `useAuth<T, TRegister>().register({ email, password, username })` is
 *   typed exactly like the client call.
 */
export interface UseAuthResult<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /**
   * The session state as one value — render from this instead of combining
   * `initialized`/`authenticated`/`loading`. A stored token AND user make it
   * `'authenticated'` on the first render; only `'loading'` means "no decision
   * yet", so a route guard waits on that and nothing else. `'unavailable'` keeps
   * a session candidate for retry and can have a null profile; redirect only on
   * `'unauthenticated'`.
   */
  status: AuthState<T>['status']
  state: AuthState<T>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T, TRegister>['register']
  refresh: AuthClient<T>['refresh']
  /** Save through the configured auth transport and persist/publish its canonical profile. */
  updateProfile: AuthClient<T>['updateProfile']
  setUser: AuthClient<T>['setUser']
  /**
   * Adopt a session an exchange outside the client already established (an
   * OAuth code→token redirect, the app's own sign-in endpoint) in ONE update:
   * the token and user are stored and the hook's consumers see the client as
   * `authenticated` immediately.
   *
   * `setUser` alone does NOT sign the client in, and `setAccessToken` changes
   * storage only — using those two for a caller-issued session leaves every
   * `authenticated` read signed out.
   */
  setSession: AuthClient<T>['setSession']
  /** Whether a session is authenticated locally; this can be false while unavailable. */
  isAuthenticated: boolean
  isLoading: boolean
  /** The cached profile, which can be null while an unavailable candidate is retained. */
  user: T | null
}

/**
 * Hook result for useTheme.
 */
export interface UseThemeResult {
  theme: Theme
  themeName: string
  setTheme: (name: string) => void
  toggleTheme: () => void
  mode: 'light' | 'dark'
}

/**
 * Hook result for useRouter.
 */
export interface UseRouterResult {
  location: Router['getLocation'] extends () => infer R ? R : never
  params: Record<string, string>
  query: QueryParams
  navigate: Router['navigate']
  navigateTo: Router['navigateTo']
  back: Router['back']
  forward: Router['forward']
  isActive: Router['isActive']
}

/**
 * Hook result for useTranslation.
 */
export interface UseTranslationResult {
  /**
   * Translates a key in the active locale. A new function after each locale
   * change, so a value memoized on `[t]` refreshes; `useT()` returns one that
   * keeps its identity across locale changes.
   */
  t: I18nProvider['t']
  /** The active locale code. */
  locale: string
  /** Switches the active locale. Same function while the provider is unchanged. */
  setLocale: I18nProvider['setLocale']
  /** The registered locales; a new list only after a locale notification. */
  locales: ReturnType<I18nProvider['getLocales']>
  /** Formats a number for the active locale. Same function while the provider is unchanged. */
  formatNumber: I18nProvider['formatNumber']
  /** Formats a date for the active locale. Same function while the provider is unchanged. */
  formatDate: I18nProvider['formatDate']
  /** The active locale's text direction. */
  direction: 'ltr' | 'rtl'
}

/**
 * Options for the shorthand form of {@link UseTFunction}: the fallback text is
 * passed positionally, so only `count` remains here.
 */
export type UseTShorthandOptions = Omit<TranslateOptions, 'defaultValue'>

/**
 * Translation function returned by `useT()`.
 *
 * Two compatible call forms:
 * - `t(key, values?, options?)` — the {@link I18nProvider.t} signature.
 * - `t(key, fallback, options?)` — a string second argument is the inline
 *   English `defaultValue`, with optional `count` for pluralization.
 *
 * Its identity is stable while the i18n provider instance is unchanged, so it
 * can be used directly as an effect dependency.
 */
export type UseTFunction = TranslateFunctionWithFallback

/**
 * Hook result for useWorkspace.
 */
export interface UseWorkspaceResult {
  layout: WorkspaceLayout
  activePanel: PanelId | null
  collapsedPanels: Set<PanelId>
  togglePanel: (panelId: PanelId) => void
  resizePanel: (panelId: PanelId, size: number) => void
  setActivePanel: (panelId: PanelId) => void
  resetLayout: () => void
}

/**
 * Hook result for useEditor.
 */
export interface UseEditorResult {
  tabs: EditorTab[]
  activeFile: string | null
  openFile: (file: EditorFile) => void
  closeFile: (path: string) => void
  getContent: () => string | null
  setContent: (path: string, content: string) => void
  setActiveTab: (path: string) => void
  mount: EditorProvider['mount']
  dispose: () => void
  focus: () => void
  openDiff: (file: DiffFile) => void
  closeDiff: () => void
  pinTab: (path: string) => void
  addExtraLib: (content: string, filePath: string) => void
  onFixWithAI: (callback: (request: FixWithAIRequest) => void) => () => void
}

/**
 * Hook result for usePreview.
 */
export interface UsePreviewResult {
  state: PreviewState
  setUrl: (url: string) => void
  refresh: () => void
  setDevice: (device: DeviceFrame) => void
  openExternal: () => void
  /**
   * Records a navigation the running preview reported via its `molecule:navigate`
   * message — updates the displayed current location without reloading the iframe.
   * Pass `isReplace` when the preview REPLACED its current history entry (a
   * `replaceState` redirect/canonicalization) so the forward stack is preserved
   * instead of truncated (a `pushState`, the default, truncates forward).
   */
  recordNavigation: (url: string, isReplace?: boolean) => void
  /** Navigates the preview to the previous navigation-history entry (Back). */
  back: () => void
  /** Navigates the preview to the next navigation-history entry (Forward). */
  forward: () => void
}

// Re-export core types for convenience
// Note: I18nProvider, LoggerProvider, StateProvider, StorageProvider, and ThemeProvider
// are not re-exported here because providers.tsx exports React components with the same names.
// Import these types directly from their respective packages instead.
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
