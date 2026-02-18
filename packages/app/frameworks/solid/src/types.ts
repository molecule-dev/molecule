/**
 * Solid.js-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'

import type { AuthClient, AuthState } from '@molecule/app-auth'
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
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
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
 */
export interface AuthPrimitives<T = unknown> {
  state: Accessor<AuthState<T>>
  user: Accessor<T | null>
  isAuthenticated: Accessor<boolean>
  isLoading: Accessor<boolean>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T>['register']
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
