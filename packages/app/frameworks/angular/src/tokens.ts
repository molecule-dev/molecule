/**
 * Angular injection tokens for molecule.dev providers.
 *
 * @module
 */

import { InjectionToken } from '@angular/core'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

/**
 * Injection token for state provider.
 */
export const STATE_PROVIDER = new InjectionToken<StateProvider>('molecule-state-provider')

/**
 * Injection token for auth client.
 */
export const AUTH_CLIENT = new InjectionToken<AuthClient<unknown>>('molecule-auth-client')

/**
 * Injection token for theme provider.
 */
export const THEME_PROVIDER = new InjectionToken<ThemeProvider>('molecule-theme-provider')

/**
 * Injection token for router.
 */
export const ROUTER = new InjectionToken<Router>('molecule-router')

/**
 * Injection token for i18n provider.
 */
export const I18N_PROVIDER = new InjectionToken<I18nProvider>('molecule-i18n-provider')

/**
 * Injection token for HTTP client.
 */
export const HTTP_CLIENT = new InjectionToken<HttpClient>('molecule-http-client')

/**
 * Injection token for storage provider.
 */
export const STORAGE_PROVIDER = new InjectionToken<StorageProvider>('molecule-storage-provider')

/**
 * Injection token for logger provider.
 */
export const LOGGER_PROVIDER = new InjectionToken<LoggerProvider>('molecule-logger-provider')
