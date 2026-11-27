/**
 * Svelte-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Component, Snippet } from 'svelte'
import type { Readable, Writable } from 'svelte/store'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState } from '@molecule/app-auth'
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
 * Configuration for molecule Svelte context.
 */
export interface MoleculeConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
  /** The AI chat provider useChat and useChatProvider use. */
  chat?: ChatProvider
  /** The IDE workspace provider useWorkspace and useWorkspaceProvider use. */
  workspace?: WorkspaceProvider
  /** The code editor provider useEditor and useEditorProvider use. */
  editor?: EditorProvider
  /** The live preview provider usePreview and usePreviewProvider use. */
  preview?: PreviewProvider
}

/**
 * Props for the `SessionReady` component: its `children` snippet renders once
 * the auth client has decided the session, `fallback` until then.
 */
export interface SessionReadyProps {
  /** What renders once the initial restore settles — signed in, signed out, or unavailable. */
  children?: Snippet
  /** What renders while the session restore is still undecided; default nothing. */
  fallback?: Snippet
}

/**
 * What every provider component takes besides its service: the tree that reads it, as
 * React's `children` (a snippet here).
 */
export interface ProviderProps {
  /** The tree that reads the provided service. */
  children?: Snippet
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
  client: AuthClient<T>
  /** Wait for initial session restoration by default. Set false for a deliberately ungated shell or synchronous SSR. */
  awaitSession?: boolean
  /** Content shown while the initial session status is loading; default nothing. */
  sessionFallback?: Snippet
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
   * the bond has none (SvelteKit gives a layout its page as `children`), and `<RoutedView />`
   * then throws an error saying so.
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
 * Props for the `MoleculeProvider` component: each service is optional, and only the
 * services passed are provided (`state` falls back to the bonded state provider).
 */
export interface MoleculeProviderProps extends ProviderProps, MoleculeConfig {
  /**
   * Render the app only once `auth` leaves its initial loading status ({@link SessionReadyProps}). Defaults to true.
   * With the bundled JWT client, a stored token AND cached user restore synchronously.
   * Token-only and cookie-only sessions need an asynchronous current-user request;
   * until it answers `useAuth().user` is `null` — a public page's signed-in action
   * (`if (!$user) return`, a redirect to `/login`) then treats a signed-in visitor as signed out.
   * When restoration succeeds, every page's first render reads the restored user. An
   * `'unavailable'` session also renders, but remains unconfirmed and may have a null user.
   * A visitor with no session candidate settles synchronously without a request.
   * Ignored without `auth`.
   */
  awaitSession?: boolean
  /** Rendered instead of the app while {@link MoleculeProviderProps.awaitSession} waits; default nothing. */
  sessionFallback?: Snippet
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

// Re-export core types for convenience. StateProvider, ThemeProvider, I18nProvider, StorageProvider and
// LoggerProvider are the provider components here, as in @molecule/app-react (providers/providers.ts keeps a
// deprecated type alias under each name).
export type {
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  FormResetOptions,
  HttpClient,
  Logger,
  MoleculeStore,
  QueryParams,
  Readable,
  RouteLocation,
  RouteParams,
  Router,
  RouterConfig,
  Store,
  StoreConfig,
  Theme,
  Writable,
}
