/**
 * React provider components for molecule.dev framework bindings.
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
 * @param root0 - The component props.
 * @param root0.provider - The state provider instance.
 * @param root0.children - The child elements to render.
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
 * @param root0 - The component props.
 * @param root0.client - The auth client instance.
 * @param root0.children - The child elements to render.
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
 * @param root0 - The component props.
 * @param root0.provider - The theme provider instance.
 * @param root0.children - The child elements to render.
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
 * @param root0 - The component props.
 * @param root0.router - The router instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered router provider element.
 * @example
 * ```tsx
 * import { createRouter } from '@molecule/app-routing-react-router'
 *
 * const router = createRouter({ ... })
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
 * @param root0 - The component props.
 * @param root0.provider - The i18n provider instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered i18n provider element.
 * @example
 * ```tsx
 * import { createI18nProvider } from '@molecule/app-i18n-react-i18next'
 *
 * const i18n = createI18nProvider({ ... })
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
 * @param root0 - The component props.
 * @param root0.client - The HTTP client instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered HTTP provider element.
 * @example
 * ```tsx
 * import { createHttpClient } from '@molecule/app-http-axios'
 *
 * const httpClient = createHttpClient({ baseURL: '/api' })
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
 * @param root0 - The component props.
 * @param root0.provider - The storage provider instance.
 * @param root0.children - The child elements to render.
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
 * @param root0 - The component props.
 * @param root0.provider - The logger provider instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered logger provider element.
 * @example
 * ```tsx
 * import { provider } from '@molecule/app-logger-loglevel'
 *
 * <LoggerProvider provider={provider}>
 *   <App />
 * </LoggerProvider>
 * ```
 */
export function LoggerProvider({ provider, children }: LoggerProviderProps): React.ReactElement {
  return <LoggerContext.Provider value={provider}>{children}</LoggerContext.Provider>
}

/**
 * Provider for AI chat.
 * @param root0 - The component props.
 * @param root0.provider - The chat provider instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered chat provider element.
 */
export function ChatProvider({ provider, children }: ChatProviderProps): React.ReactElement {
  return <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
}

/**
 * Provider for IDE workspace.
 * @param root0 - The component props.
 * @param root0.provider - The workspace provider instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered workspace provider element.
 */
export function WorkspaceProvider({ provider, children }: WorkspaceProviderProps): React.ReactElement {
  return <WorkspaceContext.Provider value={provider}>{children}</WorkspaceContext.Provider>
}

/**
 * Provider for code editor.
 * @param root0 - The component props.
 * @param root0.provider - The editor provider instance.
 * @param root0.children - The child elements to render.
 * @returns The rendered editor provider element.
 */
export function EditorProvider({ provider, children }: EditorProviderProps): React.ReactElement {
  return <EditorContext.Provider value={provider}>{children}</EditorContext.Provider>
}

/**
 * Provider for live preview.
 * @param root0 - The component props.
 * @param root0.provider - The preview provider instance.
 * @param root0.children - The child elements to render.
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
 * @param root0 - The component props.
 * @param root0.children - The child elements to render.
 * @param root0.state - Optional state provider.
 * @param root0.auth - Optional auth client.
 * @param root0.theme - Optional theme provider.
 * @param root0.router - Optional router instance.
 * @param root0.i18n - Optional i18n provider.
 * @param root0.http - Optional HTTP client.
 * @param root0.storage - Optional storage provider.
 * @param root0.logger - Optional logger provider.
 * @param root0.chat - Optional chat provider.
 * @param root0.workspace - Optional workspace provider.
 * @param root0.editor - Optional editor provider.
 * @param root0.preview - Optional preview provider.
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
