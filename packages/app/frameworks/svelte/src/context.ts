/**
 * Svelte context for molecule.dev providers.
 *
 * @module
 */

import type { Component } from 'svelte'
import { getContext, onDestroy, setContext } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'

import type { AuthClient, RegisterExtraShape } from '@molecule/app-auth'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import { getProvider as getBondedI18nProvider, I18nError, t } from '@molecule/app-i18n'
import type { WorkspaceProvider } from '@molecule/app-ide'
import type { PreviewProvider } from '@molecule/app-live-preview'
import type { LoggerProvider } from '@molecule/app-logger'
import { resolveLinkPath, type Router } from '@molecule/app-routing'
import {
  getProvider as getBondedStateProvider,
  hasProvider as hasBondedStateProvider,
  type StateProvider,
} from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import { setChatContext } from './chat-context.js'
import { type MaybeReadable, toReadable } from './hooks/maybe-readable.js'
import { setRoutedViewContext } from './routed-view-context.js'
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
const WORKSPACE_KEY = Symbol('molecule-workspace')
const EDITOR_KEY = Symbol('molecule-editor')
const PREVIEW_KEY = Symbol('molecule-preview')

/**
 * Set all molecule providers in Svelte context.
 *
 * Call this in your root layout/component. Only the services passed are set, except `state`,
 * which falls back to the state provider bonded under `@molecule/app-state` (as
 * `MoleculeProvider` does), so `useStore()` works without a `state` option. To hold the app
 * until the session is decided, render `MoleculeProvider` (its `awaitSession`) or
 * `SessionReady` instead.
 *
 * @example
 * ```svelte
 * <script>
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { provider as stateProvider } from '@molecule/app-state-zustand'
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
 * @param config - Provider instances to register (state, auth, theme, router, i18n, http, storage, logger, chat, workspace, editor, preview).
 */
export function setMoleculeContext(config: MoleculeConfig): void {
  // A `state` option wins; otherwise the BONDED state provider, the singleton every
  // `createStore()` reads, as React's `MoleculeProvider` falls back to it.
  const state = config.state ?? (hasBondedStateProvider() ? getBondedStateProvider() : undefined)
  if (state) setContext(STATE_KEY, state)
  if (config.auth) setContext(AUTH_KEY, config.auth)
  if (config.theme) setContext(THEME_KEY, config.theme)
  if (config.router) setContext(ROUTER_KEY, config.router)
  if (config.i18n) setContext(I18N_KEY, config.i18n)
  if (config.http) setContext(HTTP_KEY, config.http)
  if (config.storage) setContext(STORAGE_KEY, config.storage)
  if (config.logger) setContext(LOGGER_KEY, config.logger)
  if (config.chat) setChatContext(config.chat)
  if (config.workspace) setContext(WORKSPACE_KEY, config.workspace)
  if (config.editor) setContext(EDITOR_KEY, config.editor)
  if (config.preview) setContext(PREVIEW_KEY, config.preview)
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
 * @param options - From a routing bond: its routed view (see `RoutedView`). Given, it is set
 * too (`null` without `routedView`).
 * @param options.routedView - The component that renders the matched child route.
 */
export function setRouterContext(router: Router, options?: { routedView?: Component }): void {
  setContext(ROUTER_KEY, router)
  if (options) setRoutedViewContext(options.routedView ?? null)
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

/**
 * Sets the IDE workspace context.
 * @param provider - The workspace provider to store in Svelte context.
 */
export function setWorkspaceContext(provider: WorkspaceProvider): void {
  setContext(WORKSPACE_KEY, provider)
}

/**
 * Sets the code editor context.
 * @param provider - The editor provider to store in Svelte context.
 */
export function setEditorContext(provider: EditorProvider): void {
  setContext(EDITOR_KEY, provider)
}

/**
 * Sets the live preview context.
 * @param provider - The preview provider to store in Svelte context.
 */
export function setPreviewContext(provider: PreviewProvider): void {
  setContext(PREVIEW_KEY, provider)
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
export function getAuthClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthClient<T, TRegister> {
  const client = getContext<AuthClient<T, TRegister>>(AUTH_KEY)
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
 * @throws {I18nError} If no router has been set in context: mount the routing bond's
 * `MoleculeRouterProvider` in the root `+layout.svelte`, or call `setMoleculeContext({ router })`.
 */
export function getRouter(): Router {
  const router = getContext<Router>(ROUTER_KEY)
  if (!router)
    throw new I18nError(
      'svelte.error.noRouter',
      undefined,
      'No router here. Mount `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-sveltekit`) in the root `+layout.svelte`, or call `setMoleculeContext({ router })` there. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-sveltekit@latest`).',
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

/**
 * Gets the IDE workspace provider from Svelte context
 * (`setMoleculeContext({ workspace })`).
 * @returns The workspace provider instance.
 * @throws {Error} If no workspace provider has been set in context.
 */
export function useWorkspaceProvider(): WorkspaceProvider {
  const provider = getContext<WorkspaceProvider | undefined>(WORKSPACE_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useWorkspaceOutsideProvider', undefined, {
        defaultValue: 'useWorkspaceProvider must be used within a WorkspaceProvider',
      }),
    )
  return provider
}

/**
 * Gets the code editor provider from Svelte context
 * (`setMoleculeContext({ editor })`).
 * @returns The editor provider instance.
 * @throws {Error} If no editor provider has been set in context.
 */
export function useEditorProvider(): EditorProvider {
  const provider = getContext<EditorProvider | undefined>(EDITOR_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useEditorOutsideProvider', undefined, {
        defaultValue: 'useEditorProvider must be used within an EditorProvider',
      }),
    )
  return provider
}

/**
 * Gets the live preview provider from Svelte context
 * (`setMoleculeContext({ preview })`).
 * @returns The preview provider instance.
 * @throws {Error} If no preview provider has been set in context.
 */
export function usePreviewProvider(): PreviewProvider {
  const provider = getContext<PreviewProvider | undefined>(PREVIEW_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.usePreviewOutsideProvider', undefined, {
        defaultValue: 'usePreviewProvider must be used within a PreviewProvider',
      }),
    )
  return provider
}

/**
 * Gets the auth client from Svelte context under the React hook's name
 * (`setMoleculeContext({ auth })`).
 *
 * @param T - The user profile the API returns.
 * @param TRegister - The app's own registration fields.
 * @returns The auth client instance.
 * @throws {Error} If no auth client has been set in context.
 */
export function useAuthClient<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): AuthClient<T, TRegister> {
  const client = getContext<AuthClient<T, TRegister> | undefined>(AUTH_KEY)
  if (!client)
    throw new Error(
      t('svelte.error.useAuthOutsideProvider', undefined, {
        defaultValue: 'useAuthClient must be used within an AuthProvider',
      }),
    )
  return client
}

/**
 * Gets the i18n provider: the one the nearest `setMoleculeContext({ i18n })`
 * supplies, otherwise the bonded `@molecule/app-i18n` provider, which is the
 * one the static `t` reads — React's `useI18nProvider` contract. A component
 * can therefore translate through {@link useTranslation} wherever the static
 * `t` works, and it re-renders when the locale changes.
 *
 * @returns The i18n provider from context, or the bonded provider.
 */
export function useI18nProvider(): I18nProvider {
  return getContext<I18nProvider | undefined>(I18N_KEY) ?? getBondedI18nProvider()
}

/**
 * Gets the theme provider from Svelte context under the React hook's name.
 * @returns The theme provider instance.
 * @throws {Error} If no theme provider has been set in context.
 */
export function useThemeProvider(): ThemeProvider {
  const provider = getContext<ThemeProvider | undefined>(THEME_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useThemeOutsideProvider', undefined, {
        defaultValue: 'useThemeProvider must be used within a ThemeProvider',
      }),
    )
  return provider
}

/**
 * The router the router-reading functions and `Link` navigate through: the one
 * set in context. Both {@link useRouterInstance} and {@link useLinkRouter} fail
 * through this one function, so the error and its text live in one place.
 *
 * @param router - The router read from context, or `undefined` with none set.
 * @returns The router.
 * @throws {I18nError} If no router has been set in context: mount the routing bond's
 * `MoleculeRouterProvider` in the root `+layout.svelte`, or call `setMoleculeContext({ router })`.
 */
function requireRouter(router: Router | undefined): Router {
  if (!router)
    throw new I18nError(
      'svelte.error.useRouterOutsideProvider',
      undefined,
      'No router here. Mount `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-sveltekit`) in the root `+layout.svelte`, or call `setMoleculeContext({ router })` there. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-sveltekit@latest`).',
    )
  return router
}

/**
 * Gets the router from Svelte context under the React hook's name.
 * @returns The router instance.
 * @throws {I18nError} If no router has been set in context: mount the routing bond's
 * `MoleculeRouterProvider` in the root `+layout.svelte`, or call `setMoleculeContext({ router })`.
 */
export function useRouterInstance(): Router {
  return requireRouter(getContext<Router | undefined>(ROUTER_KEY))
}

/**
 * The router a link to `to` navigates through, among the routers in context.
 *
 * @param mounted - The router read from context, or `undefined` with none set.
 * @param to - The link's destination: an app path or a URL.
 * @returns The router, or `null` for a URL outside the app with none set.
 * @throws {I18nError} When `to` is an app path and no router is in context.
 */
function linkRouter(mounted: Router | undefined, to: string): Router | null {
  // A URL outside the app opens through the browser or the device's URL handler: no router navigates it.
  return resolveLinkPath(to) === null ? (mounted ?? null) : requireRouter(mounted)
}

/**
 * The router a link navigates through, under React's hook name: the router set
 * in context, or `null` for a URL outside the app when none is. The browser, or
 * on a device the URL handler, opens such a URL, so a link to it renders in an
 * app with no router (a widget, a static page). A link to an app path still
 * fails without one: that is how an app that forgot to mount its router finds
 * out.
 *
 * `Link` uses it. With a destination it answers for that one and follows it
 * while the component lives. Without one (the destination is a `$state` prop of
 * a runes component, which is no store) it returns a function to call with the
 * destination wherever it is known; call it during component initialisation,
 * which reads the context once.
 *
 * @param path - The link's destination: an app path or a URL, or a readable store of one.
 * @returns A readable store of the router the link navigates through, or `null` for a URL
 * outside the app with no router in context.
 * @throws {I18nError} When `path` is an app path and no router is in context: the error
 * {@link useRouterInstance} throws, with the same fix.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import type { Snippet } from 'svelte'
 *   import { writable } from 'svelte/store'
 *
 *   import { routerLinkHref } from '@molecule/app-routing'
 *   import { useLinkRouter } from '@molecule/app-svelte'
 *
 *   let { children }: { children?: Snippet } = $props()
 *   const to = writable('/settings')
 *   const router = useLinkRouter(to)
 * </script>
 *
 * <a href={$router === null ? $to : routerLinkHref($to, $router)}>{@render children?.()}</a>
 * ```
 */
export function useLinkRouter(path: MaybeReadable<string>): Readable<Router | null>
/**
 * Reads the router without a destination yet.
 *
 * @returns A function that takes a link's destination and gives the router it
 * navigates through, or `null` for a URL outside the app with no router in context.
 * @throws {I18nError} Never here: the returned function throws for an app path with no router in
 * context, the error {@link useRouterInstance} throws.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   const linkRouter = useLinkRouter()
 *   let { to } = $props()
 *   const router = $derived(linkRouter(to))
 * </script>
 * ```
 */
export function useLinkRouter(): (to: string) => Router | null
export function useLinkRouter(
  path?: MaybeReadable<string>,
): Readable<Router | null> | ((to: string) => Router | null) {
  const mounted = getContext<Router | undefined>(ROUTER_KEY)
  if (path === undefined) return (to) => linkRouter(mounted, to)
  const pathStore = toReadable(path)
  // Read now, so an app path with no router in context fails during initialisation, as a hook that needs a provider does.
  const router = writable<Router | null>(linkRouter(mounted, get(pathStore)))
  const stop = pathStore.subscribe((to) => router.set(linkRouter(mounted, to)))
  onDestroy(stop)
  return router
}

/**
 * Gets the HTTP client from Svelte context under the React hook's name.
 * @returns The HTTP client instance.
 * @throws {Error} If no HTTP client has been set in context.
 */
export function useHttpClient(): HttpClient {
  const client = getContext<HttpClient | undefined>(HTTP_KEY)
  if (!client)
    throw new Error(
      t('svelte.error.useHttpOutsideProvider', undefined, {
        defaultValue: 'useHttpClient must be used within an HttpProvider',
      }),
    )
  return client
}

/**
 * Gets the storage provider from Svelte context under the React hook's name.
 * @returns The storage provider instance.
 * @throws {Error} If no storage provider has been set in context.
 */
export function useStorageProvider(): StorageProvider {
  const provider = getContext<StorageProvider | undefined>(STORAGE_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useStorageOutsideProvider', undefined, {
        defaultValue: 'useStorageProvider must be used within a StorageProvider',
      }),
    )
  return provider
}

/**
 * Gets the logger provider from Svelte context under the React hook's name.
 * @returns The logger provider instance.
 * @throws {Error} If no logger provider has been set in context.
 */
export function useLoggerProvider(): LoggerProvider {
  const provider = getContext<LoggerProvider | undefined>(LOGGER_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useLoggerOutsideProvider', undefined, {
        defaultValue: 'useLoggerProvider must be used within a LoggerProvider',
      }),
    )
  return provider
}

/**
 * The fix, appended to the missing-provider error below — this accessor is
 * the one place that READS the state context, so it is the one place that has
 * to say where the context comes from. The sentences are code (an import, a
 * call, a bond), so they are appended in English rather than translated.
 */
const STATE_CONTEXT_FIX =
  ' To fix: call setMoleculeContext({ state }) in your root layout — ' +
  "`import { setMoleculeContext } from '@molecule/app-svelte'`; " +
  'setMoleculeContext also passes the provider bonded under `@molecule/app-state` ' +
  '(bond one with `setProvider(provider)` from `@molecule/app-state`), and ' +
  '`setStateContext(provider)` passes one you hold. ' +
  'To read a store you already have, call useStore(store) instead — it subscribes to the ' +
  'store it is given and needs no provider.'

/**
 * Gets the state provider from Svelte context under the React hook's name.
 *
 * Only hooks that read the context call this; `useStore(store)` takes its
 * store as an argument and works with no provider at all.
 *
 * @returns The state provider instance.
 * @throws {Error} when no state provider is in context — the message names the
 *   fix (which composition root to use, and the import for it).
 */
export function useStateProvider(): StateProvider {
  const provider = getContext<StateProvider | undefined>(STATE_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useStoreOutsideProvider', undefined, {
        defaultValue: 'useStateProvider must be used within a StateProvider',
      }) + STATE_CONTEXT_FIX,
    )
  return provider
}
