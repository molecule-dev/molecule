/**
 * Svelte-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Readable, Writable } from 'svelte/store'

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
  MoleculeStore,
  QueryParams,
  Readable,
  RouteLocation,
  RouteParams,
  Router,
  StateProvider,
  StorageProvider,
  StoreConfig,
  Theme,
  ThemeProvider,
  Writable,
}
