/**
 * Svelte context for molecule.dev providers.
 *
 * @module
 */

import { getContext, setContext } from 'svelte'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import { t } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import type { MoleculeConfig } from './types.js'

// Context keys
const STATE_KEY = Symbol('molecule-state')
const AUTH_KEY = Symbol('molecule-auth')
const THEME_KEY = Symbol('molecule-theme')
const ROUTER_KEY = Symbol('molecule-router')
const I18N_KEY = Symbol('molecule-i18n')
const HTTP_KEY = Symbol('molecule-http')
const STORAGE_KEY = Symbol('molecule-storage')
const LOGGER_KEY = Symbol('molecule-logger')

/**
 * Set all molecule providers in Svelte context.
 *
 * Call this in your root layout/component.
 *
 * @example
 * ```svelte
 * <script>
 *   import { setMoleculeContext } from '`@molecule/app-svelte`'
 *   import { provider as stateProvider } from '`@molecule/app-state-zustand`'
 *
 *   setMoleculeContext({
 *     state: stateProvider,
 *     auth: authClient,
 *     theme: themeProvider,
 *   })
 * </script>
 *
 * <slot />
 * ```
 * @param config - Provider instances to register (state, auth, theme, router, i18n, http, storage, logger).
 */
export function setMoleculeContext(config: MoleculeConfig): void {
  if (config.state) setContext(STATE_KEY, config.state)
  if (config.auth) setContext(AUTH_KEY, config.auth)
  if (config.theme) setContext(THEME_KEY, config.theme)
  if (config.router) setContext(ROUTER_KEY, config.router)
  if (config.i18n) setContext(I18N_KEY, config.i18n)
  if (config.http) setContext(HTTP_KEY, config.http)
  if (config.storage) setContext(STORAGE_KEY, config.storage)
  if (config.logger) setContext(LOGGER_KEY, config.logger)
}

// Individual setters
/**
 * Sets the state context.
 * @param provider - The state provider to store in Svelte context.
 */
export function setStateContext(provider: StateProvider): void {
  setContext(STATE_KEY, provider)
}

/**
 * Sets the auth context.
 * @param client - The auth client to store in Svelte context.
 */
export function setAuthContext<T>(client: AuthClient<T>): void {
  setContext(AUTH_KEY, client)
}

/**
 * Sets the theme context.
 * @param provider - The theme provider to store in Svelte context.
 */
export function setThemeContext(provider: ThemeProvider): void {
  setContext(THEME_KEY, provider)
}

/**
 * Sets the router context.
 * @param router - The router instance to store in Svelte context.
 */
export function setRouterContext(router: Router): void {
  setContext(ROUTER_KEY, router)
}

/**
 * Sets the i18n context.
 * @param provider - The i18n provider to store in Svelte context.
 */
export function setI18nContext(provider: I18nProvider): void {
  setContext(I18N_KEY, provider)
}

/**
 * Sets the HTTP context.
 * @param client - The HTTP client to store in Svelte context.
 */
export function setHttpContext(client: HttpClient): void {
  setContext(HTTP_KEY, client)
}

/**
 * Sets the storage context.
 * @param provider - The storage provider to store in Svelte context.
 */
export function setStorageContext(provider: StorageProvider): void {
  setContext(STORAGE_KEY, provider)
}

/**
 * Sets the logger context.
 * @param provider - The logger provider to store in Svelte context.
 */
export function setLoggerContext(provider: LoggerProvider): void {
  setContext(LOGGER_KEY, provider)
}

// Getters
/**
 * Gets the state provider from Svelte context.
 * @returns The state provider instance.
 * @throws {Error} If no state provider has been set in context.
 */
export function getStateProvider(): StateProvider {
  const provider = getContext<StateProvider>(STATE_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.noStateProvider', undefined, {
        defaultValue: 'State provider not found in context',
      }),
    )
  return provider
}

/**
 * Gets the auth client from Svelte context.
 * @returns The auth client instance.
 * @throws {Error} If no auth client has been set in context.
 */
export function getAuthClient<T = unknown>(): AuthClient<T> {
  const client = getContext<AuthClient<T>>(AUTH_KEY)
  if (!client)
    throw new Error(
      t('svelte.error.noAuthClient', undefined, {
        defaultValue: 'Auth client not found in context',
      }),
    )
  return client
}

/**
 * Gets the theme provider from Svelte context.
 * @returns The theme provider instance.
 * @throws {Error} If no theme provider has been set in context.
 */
export function getThemeProvider(): ThemeProvider {
  const provider = getContext<ThemeProvider>(THEME_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.noThemeProvider', undefined, {
        defaultValue: 'Theme provider not found in context',
      }),
    )
  return provider
}

/**
 * Gets the router from Svelte context.
 * @returns The router instance.
 * @throws {Error} If no router has been set in context.
 */
export function getRouter(): Router {
  const router = getContext<Router>(ROUTER_KEY)
  if (!router)
    throw new Error(
      t('svelte.error.noRouter', undefined, { defaultValue: 'Router not found in context' }),
    )
  return router
}

/**
 * Gets the i18n provider from Svelte context.
 * @returns The i18n provider instance.
 * @throws {Error} If no i18n provider has been set in context.
 */
export function getI18nProvider(): I18nProvider {
  const provider = getContext<I18nProvider>(I18N_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.noI18nProvider', undefined, {
        defaultValue: 'I18n provider not found in context',
      }),
    )
  return provider
}

/**
 * Gets the HTTP client from Svelte context.
 * @returns The HTTP client instance.
 * @throws {Error} If no HTTP client has been set in context.
 */
export function getHttpClient(): HttpClient {
  const client = getContext<HttpClient>(HTTP_KEY)
  if (!client)
    throw new Error(
      t('svelte.error.noHttpClient', undefined, {
        defaultValue: 'HTTP client not found in context',
      }),
    )
  return client
}

/**
 * Gets the storage provider from Svelte context.
 * @returns The storage provider instance.
 * @throws {Error} If no storage provider has been set in context.
 */
export function getStorageProvider(): StorageProvider {
  const provider = getContext<StorageProvider>(STORAGE_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.noStorageProvider', undefined, {
        defaultValue: 'Storage provider not found in context',
      }),
    )
  return provider
}

/**
 * Gets the logger provider from Svelte context.
 * @returns The logger provider instance.
 * @throws {Error} If no logger provider has been set in context.
 */
export function getLoggerProvider(): LoggerProvider {
  const provider = getContext<LoggerProvider>(LOGGER_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.noLoggerProvider', undefined, {
        defaultValue: 'Logger provider not found in context',
      }),
    )
  return provider
}
