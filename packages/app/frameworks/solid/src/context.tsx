/**
 * Solid.js context utilities for molecule.dev framework bindings.
 *
 * @module
 */

import { createContext, type JSX,type ParentComponent, useContext } from 'solid-js'

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

/**
 * Internal contexts for molecule providers.
 */
const StateContext = createContext<StateProvider>()
const AuthContext = createContext<AuthClient<unknown>>()
const ThemeContext = createContext<ThemeProvider>()
const RouterContext = createContext<Router>()
const I18nContext = createContext<I18nProvider>()
const HttpContext = createContext<HttpClient>()
const StorageContext = createContext<StorageProvider>()
const LoggerContext = createContext<LoggerProvider>()

/**
 * Get the state provider from context.
 *
 * @returns The state provider instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getStateProvider(): StateProvider {
  const ctx = useContext(StateContext)
  if (!ctx) {
    throw new Error(t('solid.error.stateOutsideProvider', undefined, { defaultValue: 'getStateProvider must be used within a MoleculeProvider with state configured' }))
  }
  return ctx
}

/**
 * Get the auth client from context.
 *
 * @returns The auth client instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getAuthClient<T = unknown>(): AuthClient<T> {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error(t('solid.error.authOutsideProvider', undefined, { defaultValue: 'getAuthClient must be used within a MoleculeProvider with auth configured' }))
  }
  return ctx as AuthClient<T>
}

/**
 * Get the theme provider from context.
 *
 * @returns The theme provider instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getThemeProvider(): ThemeProvider {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error(t('solid.error.themeOutsideProvider', undefined, { defaultValue: 'getThemeProvider must be used within a MoleculeProvider with theme configured' }))
  }
  return ctx
}

/**
 * Get the router from context.
 *
 * @returns The router instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getRouter(): Router {
  const ctx = useContext(RouterContext)
  if (!ctx) {
    throw new Error(t('solid.error.routerOutsideProvider', undefined, { defaultValue: 'getRouter must be used within a MoleculeProvider with router configured' }))
  }
  return ctx
}

/**
 * Get the i18n provider from context.
 *
 * @returns The i18n provider instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getI18nProvider(): I18nProvider {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error(t('solid.error.i18nOutsideProvider', undefined, { defaultValue: 'getI18nProvider must be used within a MoleculeProvider with i18n configured' }))
  }
  return ctx
}

/**
 * Get the HTTP client from context.
 *
 * @returns The HTTP client instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getHttpClient(): HttpClient {
  const ctx = useContext(HttpContext)
  if (!ctx) {
    throw new Error(t('solid.error.httpOutsideProvider', undefined, { defaultValue: 'getHttpClient must be used within a MoleculeProvider with http configured' }))
  }
  return ctx
}

/**
 * Get the storage provider from context.
 *
 * @returns The storage provider instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getStorageProvider(): StorageProvider {
  const ctx = useContext(StorageContext)
  if (!ctx) {
    throw new Error(
      t('solid.error.storageOutsideProvider', undefined, { defaultValue: 'getStorageProvider must be used within a MoleculeProvider with storage configured' }),
    )
  }
  return ctx
}

/**
 * Get the logger provider from context.
 *
 * @returns The logger provider instance.
 * @throws {Error} If used outside MoleculeProvider.
 */
export function getLoggerProvider(): LoggerProvider {
  const ctx = useContext(LoggerContext)
  if (!ctx) {
    throw new Error(
      t('solid.error.loggerOutsideProvider', undefined, { defaultValue: 'getLoggerProvider must be used within a MoleculeProvider with logger configured' }),
    )
  }
  return ctx
}

/**
 * MoleculeProvider component that provides all molecule services to the component tree.
 *
 * @param props - Component props containing the molecule config.
 * @returns The nested provider tree wrapping children.
 * @example
 * ```tsx
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { createZustandProvider } from '@molecule/app-state-zustand'
 * import { createJwtAuthClient } from '@molecule/app-auth-jwt'
 *
 * function App() {
 *   return (
 *     <MoleculeProvider
 *       config={{
 *         state: createZustandProvider(),
 *         auth: createJwtAuthClient({ baseUrl: '/api' }),
 *       }}
 *     >
 *       <MyApp />
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 */
export const MoleculeProvider: ParentComponent<{ config: MoleculeConfig }> = (props) => {
  // Build nested providers based on config
  let content: JSX.Element = props.children

  if (props.config.logger) {
    const Provider = LoggerContext.Provider
    content = <Provider value={props.config.logger}>{content}</Provider>
  }

  if (props.config.storage) {
    const Provider = StorageContext.Provider
    content = <Provider value={props.config.storage}>{content}</Provider>
  }

  if (props.config.http) {
    const Provider = HttpContext.Provider
    content = <Provider value={props.config.http}>{content}</Provider>
  }

  if (props.config.i18n) {
    const Provider = I18nContext.Provider
    content = <Provider value={props.config.i18n}>{content}</Provider>
  }

  if (props.config.router) {
    const Provider = RouterContext.Provider
    content = <Provider value={props.config.router}>{content}</Provider>
  }

  if (props.config.theme) {
    const Provider = ThemeContext.Provider
    content = <Provider value={props.config.theme}>{content}</Provider>
  }

  if (props.config.auth) {
    const Provider = AuthContext.Provider
    content = <Provider value={props.config.auth}>{content}</Provider>
  }

  if (props.config.state) {
    const Provider = StateContext.Provider
    content = <Provider value={props.config.state}>{content}</Provider>
  }

  return content
}

// Export contexts for advanced use cases
export {
  AuthContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
}
