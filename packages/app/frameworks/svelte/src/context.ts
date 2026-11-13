/**
 * Svelte context for molecule.dev providers.
 *
 * @module
 */

import { getContext, setContext } from 'svelte'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, RegisterExtraShape } from '@molecule/app-auth'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import { getProvider as getBondedI18nProvider, t } from '@molecule/app-i18n'
import type { WorkspaceProvider } from '@molecule/app-ide'
import type { PreviewProvider } from '@molecule/app-live-preview'
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
const CHAT_KEY = Symbol('molecule-chat')
const WORKSPACE_KEY = Symbol('molecule-workspace')
const EDITOR_KEY = Symbol('molecule-editor')
const PREVIEW_KEY = Symbol('molecule-preview')

/**
 * Set all molecule providers in Svelte context.
 *
 * Call this in your root layout/component.
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
  if (config.state) setContext(STATE_KEY, config.state)
  if (config.auth) setContext(AUTH_KEY, config.auth)
  if (config.theme) setContext(THEME_KEY, config.theme)
  if (config.router) setContext(ROUTER_KEY, config.router)
  if (config.i18n) setContext(I18N_KEY, config.i18n)
  if (config.http) setContext(HTTP_KEY, config.http)
  if (config.storage) setContext(STORAGE_KEY, config.storage)
  if (config.logger) setContext(LOGGER_KEY, config.logger)
  if (config.chat) setContext(CHAT_KEY, config.chat)
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

/**
 * Sets the AI chat context.
 * @param provider - The chat provider to store in Svelte context.
 */
export function setChatContext(provider: ChatProvider): void {
  setContext(CHAT_KEY, provider)
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

/**
 * Gets the AI chat provider from Svelte context (`setMoleculeContext({ chat })`).
 * @returns The chat provider instance.
 * @throws {Error} If no chat provider has been set in context.
 */
export function useChatProvider(): ChatProvider {
  const provider = getContext<ChatProvider | undefined>(CHAT_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
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
 * Gets the router from Svelte context under the React hook's name.
 * @returns The router instance.
 * @throws {Error} If no router has been set in context.
 */
export function useRouterInstance(): Router {
  const router = getContext<Router | undefined>(ROUTER_KEY)
  if (!router)
    throw new Error(
      t('svelte.error.useRouterOutsideProvider', undefined, {
        defaultValue: 'useRouterInstance must be used within a RouterProvider',
      }),
    )
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
