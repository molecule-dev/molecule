/**
 * Solid.js-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Accessor, JSX, Setter } from 'solid-js'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState, RegisterExtraShape } from '@molecule/app-auth'
import type { FormController, FormOptions } from '@molecule/app-forms'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, RouteLocation, RouteParams, Router } from '@molecule/app-routing'
import type { StateProvider, Store as MoleculeStore, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Configuration for molecule Solid context.
 */
export interface MoleculeConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
  /**
   * Render the app only once `auth` has decided the session ({@link SessionReadyProps}).
   * After a full page load a returning visitor's session is restored by one request, and
   * until it answers `createAuth().user()` is `null` on every page — a public page's
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
export interface RouterPrimitives {
  location: Accessor<RouteLocation>
  params: Accessor<RouteParams>
  query: Accessor<QueryParams>
  navigate: Router['navigate']
  navigateTo: Router['navigateTo']
  back: Router['back']
  forward: Router['forward']
  isActive: Router['isActive']
}

// Re-export core types for convenience
export type {
  Accessor,
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  HttpClient,
  I18nProvider,
  Logger,
  LoggerProvider,
  MoleculeStore,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
  Setter,
  StateProvider,
  StorageProvider,
  StoreConfig,
  Theme,
  ThemeProvider,
}
