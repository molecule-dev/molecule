/**
 * Solid.js-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Accessor, Component, JSX, Setter } from 'solid-js'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState, RegisterExtraShape } from '@molecule/app-auth'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { FormController, FormOptions, FormResetOptions } from '@molecule/app-forms'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { WorkspaceProvider } from '@molecule/app-ide'
import type { PreviewProvider } from '@molecule/app-live-preview'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import type {
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
  RouterConfig,
} from '@molecule/app-routing'
import type { StateProvider, Store as MoleculeStore, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Configuration for molecule Solid context.
 */
export interface MoleculeConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
  /**
   * Render the app only once `auth` has decided the session ({@link SessionReadyProps}). Defaults
   * to true, as React's `MoleculeProvider` does.
   * With the bundled JWT client, a stored token AND cached user restore synchronously without
   * a request. Token-only and cookie-only sessions need an asynchronous current-user request;
   * until it answers `createAuth().user()` is `null` — a public page's
   * signed-in action (`if (!user()) return`, a redirect to `/login`) then treats a
   * signed-in visitor as signed out. With this set, every page's first render reads the
   * restored user when restoration succeeds. `'unavailable'` is unconfirmed and may still
   * have a null user. Without a session hint, an anonymous visitor settles in microtasks
   * without a request. Ignored without `auth`.
   */
  awaitSession?: boolean
  /** Rendered instead of the app while {@link MoleculeConfig.awaitSession} waits; default nothing. */
  sessionFallback?: JSX.Element
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
  /** The AI chat provider useChat and useChatProvider use. */
  chat?: ChatProvider
  /** The IDE workspace service useWorkspace and useWorkspaceProvider use. */
  workspace?: WorkspaceProvider
  /** The code editor service useEditor and useEditorProvider use. */
  editor?: EditorProvider
  /** The live preview service usePreview and usePreviewProvider use. */
  preview?: PreviewProvider
}

/**
 * Props for provider components.
 */
export interface ProviderProps {
  /** The tree the provider wraps. */
  children: JSX.Element
}

/**
 * Props for the `StateProvider` component.
 */
export interface StateProviderProps extends ProviderProps {
  provider: StateProvider
}

/**
 * Props for the `AuthProvider` component.
 */
export interface AuthProviderProps<T = unknown> extends ProviderProps {
  /** The auth client the tree reads. */
  client: AuthClient<T>
  /**
   * Hold rendering until `client` has decided the session, as React's
   * `AuthProvider` does; default `true`. Set `false` for a deliberately ungated
   * shell.
   */
  awaitSession?: boolean
  /** Rendered while the session restore is undecided; default nothing. */
  sessionFallback?: JSX.Element
}

/**
 * Props for the `ThemeProvider` component.
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
 * Props for the `RouterProvider` component.
 */
export interface RouterProviderProps extends ProviderProps {
  router: Router
  /**
   * The component that renders the matched child route where a layout or guard puts it, so
   * `<RoutedView />` works under any routing bond. A routing bond passes it; leave it out when
   * the bond has none (Solid Router gives a route's component its nested route as
   * `props.children`), and `<RoutedView />` then throws an error saying so.
   */
  routedView?: Component
}

/**
 * Props for the `I18nProvider` component.
 */
export interface I18nProviderProps extends ProviderProps {
  provider: I18nProvider
}

/**
 * Props for the `HttpProvider` component.
 */
export interface HttpProviderProps extends ProviderProps {
  client: HttpClient
}

/**
 * Props for the `StorageProvider` component.
 */
export interface StorageProviderProps extends ProviderProps {
  provider: StorageProvider
}

/**
 * Props for the `LoggerProvider` component.
 */
export interface LoggerProviderProps extends ProviderProps {
  provider: LoggerProvider
}

/**
 * Props for the `ChatProvider` component.
 */
export interface ChatProviderProps extends ProviderProps {
  provider: ChatProvider
}

/**
 * Props for the `WorkspaceProvider` component.
 */
export interface WorkspaceProviderProps extends ProviderProps {
  provider: WorkspaceProvider
}

/**
 * Props for the `EditorProvider` component.
 */
export interface EditorProviderProps extends ProviderProps {
  provider: EditorProvider
}

/**
 * Props for the `PreviewProvider` component.
 */
export interface PreviewProviderProps extends ProviderProps {
  provider: PreviewProvider
}

/**
 * Props for the `MoleculeProvider` component, React's flat props: each service is optional,
 * and only the services passed are provided (`state` falls back to the bonded state provider).
 */
export interface MoleculeProviderProps extends ProviderProps, MoleculeConfig {
  /** Only in the deprecated {@link MoleculeConfigProviderProps} form. */
  config?: never
}

/** Every {@link MoleculeConfig} key, absent: the deprecated form takes them only inside `config`. */
type NoFlatServices = { [K in keyof MoleculeConfig]?: never }

/**
 * The `MoleculeProvider` props before it took React's flat props: the services inside one
 * `config` object. Same defaults as the flat form.
 *
 * @deprecated Pass the services as props, as `@molecule/app-react` does:
 * `<MoleculeProvider auth={client}>` instead of `<MoleculeProvider config={{ auth: client }}>`.
 */
export interface MoleculeConfigProviderProps extends ProviderProps, NoFlatServices {
  /** The services to provide. */
  config: MoleculeConfig
}

/**
 * Props for the `SessionReady` component.
 */
export interface SessionReadyProps {
  /** What renders once the session is decided — signed in, signed out, or unavailable. */
  children: JSX.Element
  /** What renders while the session restore is still undecided; default nothing. */
  fallback?: JSX.Element
}

/**
 * State for async HTTP operations.
 */
export interface HttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * State for async storage values.
 */
export interface StorageValueState<T> {
  value: T | undefined
  loading: boolean
  error: Error | null
}

/**
 * Auth primitives return type.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `register()` is typed like the
 *   client's.
 */
export interface AuthPrimitives<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  state: Accessor<AuthState<T>>
  user: Accessor<T | null>
  isAuthenticated: Accessor<boolean>
  isLoading: Accessor<boolean>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T, TRegister>['register']
  refresh: AuthClient<T>['refresh']
}

/**
 * Theme primitives return type.
 */
export interface ThemePrimitives {
  theme: Accessor<Theme>
  themeName: Accessor<string>
  mode: Accessor<'light' | 'dark'>
  setTheme: (name: string) => void
  toggleTheme: () => void
}

/**
 * Router primitives return type.
 */
export interface UseRouterResult {
  location: Accessor<RouteLocation>
  params: Accessor<RouteParams>
  query: Accessor<QueryParams>
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
export type RouterPrimitives = UseRouterResult

// Re-export core types for convenience
// StateProvider, ThemeProvider, I18nProvider, StorageProvider and LoggerProvider are the provider
// components here, as in @molecule/app-react (provider.tsx keeps a deprecated type alias under each name).
export type {
  Accessor,
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  FormResetOptions,
  HttpClient,
  Logger,
  MoleculeStore,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
  RouterConfig,
  Setter,
  Store,
  StoreConfig,
  Theme,
}
