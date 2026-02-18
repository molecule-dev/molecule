/**
 * Angular-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { FormController, FormOptions } from '@molecule/app-forms'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, RouteLocation, RouteParams, Router } from '@molecule/app-routing'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Configuration for molecule Angular module.
 */
export interface MoleculeModuleConfig {
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
 * Injection tokens for molecule services.
 */
export interface MoleculeTokens {
  STATE_PROVIDER: symbol
  AUTH_CLIENT: symbol
  THEME_PROVIDER: symbol
  ROUTER: symbol
  I18N_PROVIDER: symbol
  HTTP_CLIENT: symbol
  STORAGE_PROVIDER: symbol
  LOGGER_PROVIDER: symbol
}

// Re-export core types for convenience
export type {
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  HttpClient,
  I18nProvider,
  Logger,
  LoggerProvider,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
  StateProvider,
  StorageProvider,
  Store,
  StoreConfig,
  Theme,
  ThemeProvider,
}
