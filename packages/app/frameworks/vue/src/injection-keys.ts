/**
 * Vue injection keys for molecule.dev providers.
 *
 * @module
 */

import type { InjectionKey } from 'vue'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

/**
 * Injection key for state provider.
 */
export const StateKey: InjectionKey<StateProvider> = Symbol('molecule-state')

/**
 * Injection key for auth client.
 */
export const AuthKey: InjectionKey<AuthClient<unknown>> = Symbol('molecule-auth')

/**
 * Injection key for theme provider.
 */
export const ThemeKey: InjectionKey<ThemeProvider> = Symbol('molecule-theme')

/**
 * Injection key for router.
 */
export const RouterKey: InjectionKey<Router> = Symbol('molecule-router')

/**
 * Injection key for i18n provider.
 */
export const I18nKey: InjectionKey<I18nProvider> = Symbol('molecule-i18n')

/**
 * Injection key for HTTP client.
 */
export const HttpKey: InjectionKey<HttpClient> = Symbol('molecule-http')

/**
 * Injection key for storage provider.
 */
export const StorageKey: InjectionKey<StorageProvider> = Symbol('molecule-storage')

/**
 * Injection key for logger provider.
 */
export const LoggerKey: InjectionKey<LoggerProvider> = Symbol('molecule-logger')
