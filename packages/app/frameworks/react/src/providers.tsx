/**
 * React provider components for the Molecule framework bindings.
 *
 * @module
 */

import type { ReactNode } from 'react'
import React from 'react'

import type { AuthClient } from '@molecule/app-auth'

import {
  AuthContext,
  ChatContext,
  EditorContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  PreviewContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
  WorkspaceContext,
} from './contexts.js'
import type {
  AuthProviderProps,
  ChatProviderProps,
  EditorProviderProps,
  HttpProviderProps,
  I18nProviderProps,
  LoggerProviderProps,
  MoleculeProviderProps,
  PreviewProviderProps,
  RouterProviderProps,
  StateProviderProps,
  StorageProviderProps,
  ThemeProviderProps,
  WorkspaceProviderProps,
} from './types.js'

/**
 * Provider for state management.
 *
 * @param props - Component props (see {@link StateProviderProps}).
 * @returns The rendered state provider element.
 * @example
 * ```tsx
 * import { provider } from '@molecule/app-state-zustand'
 *
 * <StateProvider provider={provider}>
 *   <App />
 * </StateProvider>
 * ```
 */
export function StateProvider({ provider, children }: StateProviderProps): React.ReactElement {
  return <StateContext.Provider value={provider}>{children}</StateContext.Provider>
}

/**
 * Provider for authentication.
 *
 * @param props - Component props (see {@link AuthProviderProps}).
 * @returns The rendered auth provider element.
 * @example
 * ```tsx
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * <AuthProvider client={authClient}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider<T = unknown>({
  client,
  children,
}: AuthProviderProps<T>): React.ReactElement {
  return (
    <AuthContext.Provider value={client as AuthClient<unknown>}>{children}</AuthContext.Provider>
  )
}

/**
 * Provider for theming.
 *
 * @param props - Component props (see {@link ThemeProviderProps}).
 * @returns The rendered theme provider element.
 * @example
 * ```tsx
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * <ThemeProvider provider={themeProvider}>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ provider, children }: ThemeProviderProps): React.ReactElement {
  return <ThemeContext.Provider value={provider}>{children}</ThemeContext.Provider>
}

/**
 * Provider for routing.
 *
 * @param props - Component props (see {@link RouterProviderProps}).
 * @returns The rendered router provider element.
 * @example
 * ```tsx
 * import { createReactRouter } from '@molecule/app-routing-react-router'
 *
 * const router = createReactRouter()
 *
 * <RouterProvider router={router}>
 *   <App />
 * </RouterProvider>
 * ```
 */
export function RouterProvider({ router, children }: RouterProviderProps): React.ReactElement {
  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>
}

/**
 * Provider for internationalization.
 *
 * @param props - Component props (see {@link I18nProviderProps}).
 * @returns The rendered i18n provider element.
 * @example
 * ```tsx
 * import { createReactI18nextProvider } from '@molecule/app-i18n-react-i18next'
 *
 * const i18n = createReactI18nextProvider()
 *
 * <I18nProvider provider={i18n}>
 *   <App />
 * </I18nProvider>
 * ```
 */
export function I18nProvider({ provider, children }: I18nProviderProps): React.ReactElement {
  return <I18nContext.Provider value={provider}>{children}</I18nContext.Provider>
}

/**
 * Provider for HTTP client.
 *
 * @param props - Component props (see {@link HttpProviderProps}).
 * @returns The rendered HTTP provider element.
 * @example
 * ```tsx
 * import { createAxiosClient } from '@molecule/app-http-axios'
 *
 * const httpClient = createAxiosClient({ baseURL: '/api' })
 *
 * <HttpProvider client={httpClient}>
 *   <App />
 * </HttpProvider>
 * ```
 */
export function HttpProvider({ client, children }: HttpProviderProps): React.ReactElement {
  return <HttpContext.Provider value={client}>{children}</HttpContext.Provider>
}

/**
 * Provider for storage.
 *
 * @param props - Component props (see {@link StorageProviderProps}).
 * @returns The rendered storage provider element.
 * @example
 * ```tsx
 * import { provider } from '@molecule/app-storage-localstorage'
 *
 * <StorageProvider provider={provider}>
 *   <App />
 * </StorageProvider>
 * ```
 */
export function StorageProvider({ provider, children }: StorageProviderProps): React.ReactElement {
  return <StorageContext.Provider value={provider}>{children}</StorageContext.Provider>
}

/**
 * Provider for logging.
 *
 * @param props - Component props (see {@link LoggerProviderProps}).
 * @returns The rendered logger provider element.
 * @example
 * ```tsx
 * import { createConsoleLoggerProvider } from '@molecule/app-logger'
 *
 * const loggerProvider = createConsoleLoggerProvider()
 *
 * <LoggerProvider provider={loggerProvider}>
 *   <App />
 * </LoggerProvider>
 * ```
 */
export function LoggerProvider({ provider, children }: LoggerProviderProps): React.ReactElement {
  return <LoggerContext.Provider value={provider}>{children}</LoggerContext.Provider>
}

/**
 * Provider for AI chat.
 * @param props - Component props (see {@link ChatProviderProps}).
 * @returns The rendered chat provider element.
 */
export function ChatProvider({ provider, children }: ChatProviderProps): React.ReactElement {
  return <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
}

/**
 * Provider for IDE workspace.
 * @param props - Component props (see {@link WorkspaceProviderProps}).
 * @returns The rendered workspace provider element.
 */
export function WorkspaceProvider({
  provider,
  children,
}: WorkspaceProviderProps): React.ReactElement {
  return <WorkspaceContext.Provider value={provider}>{children}</WorkspaceContext.Provider>
}

/**
 * Provider for code editor.
 * @param props - Component props (see {@link EditorProviderProps}).
 * @returns The rendered editor provider element.
 */
export function EditorProvider({ provider, children }: EditorProviderProps): React.ReactElement {
  return <EditorContext.Provider value={provider}>{children}</EditorContext.Provider>
}

/**
 * Provider for live preview.
 * @param props - Component props (see {@link PreviewProviderProps}).
 * @returns The rendered preview provider element.
 */
export function PreviewProvider({ provider, children }: PreviewProviderProps): React.ReactElement {
  return <PreviewContext.Provider value={provider}>{children}</PreviewContext.Provider>
}

/**
 * Combined provider for all molecule services.
 *
 * Provides a convenient way to wrap your app with all molecule providers at once.
 * Only providers that are passed will be included.
 *
 * @param props - Component props (see {@link MoleculeProviderProps}) — each service is
 *   optional, and ONLY the services passed are provided to the tree.
 * @returns The rendered combined provider element.
 * @example
 * ```tsx
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * <MoleculeProvider
 *   state={stateProvider}
 *   auth={authClient}
 *   theme={themeProvider}
 * >
 *   <App />
 * </MoleculeProvider>
 * ```
 */
export function MoleculeProvider({
  children,
  state,
  auth,
  theme,
  router,
  i18n,
  http,
  storage,
  logger,
  chat,
  workspace,
  editor,
  preview,
}: MoleculeProviderProps): React.ReactElement {
  // Build provider tree from inside out
  let result: ReactNode = children

  if (preview) {
    result = <PreviewContext.Provider value={preview}>{result}</PreviewContext.Provider>
  }

  if (editor) {
    result = <EditorContext.Provider value={editor}>{result}</EditorContext.Provider>
  }

  if (workspace) {
    result = <WorkspaceContext.Provider value={workspace}>{result}</WorkspaceContext.Provider>
  }

  if (chat) {
    result = <ChatContext.Provider value={chat}>{result}</ChatContext.Provider>
  }

  if (logger) {
    result = <LoggerContext.Provider value={logger}>{result}</LoggerContext.Provider>
  }

  if (storage) {
    result = <StorageContext.Provider value={storage}>{result}</StorageContext.Provider>
  }

  if (http) {
    result = <HttpContext.Provider value={http}>{result}</HttpContext.Provider>
  }

  if (i18n) {
    result = <I18nContext.Provider value={i18n}>{result}</I18nContext.Provider>
  }

  if (router) {
    result = <RouterContext.Provider value={router}>{result}</RouterContext.Provider>
  }

  if (theme) {
    result = <ThemeContext.Provider value={theme}>{result}</ThemeContext.Provider>
  }

  if (auth) {
    result = <AuthContext.Provider value={auth}>{result}</AuthContext.Provider>
  }

  if (state) {
    result = <StateContext.Provider value={state}>{result}</StateContext.Provider>
  }

  return <>{result}</>
}
