/**
 * Vue-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { ComputedRef, Ref } from 'vue'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { FormController, FormOptions } from '@molecule/app-forms'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, RouteParams, Router, RouterConfig } from '@molecule/app-routing'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Options for useStore composable.
 */
export interface UseStoreOptions<T, S> {
  selector?: (state: T) => S
}

/**
 * Return type for useAuth composable.
 */
export interface UseAuthReturn<T = unknown> {
  state: ComputedRef<AuthState<T>>
  user: ComputedRef<T | null>
  isAuthenticated: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T>['register']
  refresh: AuthClient<T>['refresh']
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
 * Options for useHttp composable.
 */
export interface UseHttpOptions {
  immediate?: boolean
  onSuccess?: <T>(data: T) => void
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
