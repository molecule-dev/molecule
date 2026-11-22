/**
 * React provider components for the Molecule framework bindings.
 *
 * @module
 */

import type { ReactNode } from 'react'
import React, { useState } from 'react'

import type { AuthClient } from '@molecule/app-auth'
import { I18nError } from '@molecule/app-i18n'
import {
  getProvider as getStateProvider,
  hasProvider as hasStateProvider,
} from '@molecule/app-state'

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
import { RouteParamsHookContext } from './route-params-hook-context.js'
import { RoutedViewContext } from './routed-view-context.js'
import { SessionReady } from './session-ready.js'
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
  awaitSession = true,
  sessionFallback,
}: AuthProviderProps<T>): React.ReactElement {
  return (
    <AuthContext.Provider value={client as AuthClient<unknown>}>
      {awaitSession ? <SessionReady fallback={sessionFallback}>{children}</SessionReady> : children}
    </AuthContext.Provider>
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
 * Provider for routing. A routing bond renders it for the app (the react-router bond's
 * `BrowserRouter` does), so app code rarely mounts it by hand.
 *
 * @param props - Component props (see {@link RouterProviderProps}).
 * @returns The rendered router provider element.
 * @example
 * ```tsx
 * import { Outlet } from 'react-router'
 *
 * // Inside a routing bond: hand app-react the router and the bond's routed view.
 * <RouterProvider router={router} routedView={Outlet}>
 *   {children}
 * </RouterProvider>
 * ```
 */
export function RouterProvider({
  router,
  routedView,
  useRouteParams,
  children,
}: RouterProviderProps): React.ReactElement {
  // Read once: the routing hooks call this hook on every render, so it must never change
  // between them (a different hook there would change the hook order).
  const [routeParamsHook] = useState(() => useRouteParams ?? null)
  return (
    <RouterContext.Provider value={router}>
      <RoutedViewContext.Provider value={routedView ?? null}>
        <RouteParamsHookContext.Provider value={routeParamsHook}>
          {children}
        </RouteParamsHookContext.Provider>
      </RoutedViewContext.Provider>
    </RouterContext.Provider>
  )
}

/**
 * Renders the matched child route, through whichever routing bond the app wired (React
 * Router's `Outlet` under the react-router bond). A layout or guard used as a route element
 * renders it where its page goes, so the component imports no router library.
 *
 * @returns The routing bond's routed view.
 * @throws {I18nError} When the routing bond has no routed view (Next.js gives a layout its
 * page as children): pass the page as children instead. Rendering nothing there would show a
 * blank page with no error.
 * @example
 * ```tsx
 * function Shell({ children }: { children?: ReactNode }) {
 *   return <main>{children ?? <RoutedView />}</main>
 * }
 * ```
 */
export function RoutedView(): React.ReactElement {
  const View = React.useContext(RoutedViewContext)
  if (!View) {
    throw new I18nError(
      'react.error.noRoutedView',
      undefined,
      'This routing bond has no routed view to render here: pass the page as children instead.',
    )
  }
  return <View />
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
 * Only providers that are passed will be included — except `state`, which falls
 * back to the state provider bonded under `@molecule/app-state` (set by
 * `setupAllDefaultBonds()` or a state bond) so `useStore()` works without a
 * `state` prop.
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
  awaitSession = true,
  sessionFallback,
}: MoleculeProviderProps): React.ReactElement {
  // Build provider tree from inside out. The session hold is innermost: its fallback still sees
  // every service, and it reads the auth context provided below.
  let result: ReactNode =
    awaitSession && auth ? (
      <SessionReady fallback={sessionFallback}>{children}</SessionReady>
    ) : (
      children
    )

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

  // Fall back to the BONDED state provider: it is the singleton every
  // `createStore()` reads, so `useStore()` inside a scaffolded app needs no
  // `state` prop. Nothing wired the React context before, so the documented
  // createStore()+useStore() pattern threw "useStateProvider must be used
  // within a StateProvider" on a correctly-built app (X1 flash-m65). A
  // `state` prop still wins — that is how an app overrides the bond.
  const stateContext = state ?? (hasStateProvider() ? getStateProvider() : undefined)
  if (stateContext) {
    result = <StateContext.Provider value={stateContext}>{result}</StateContext.Provider>
  }

  return <>{result}</>
}
