/**
 * Svelte provider components, `@molecule/app-react`'s `MoleculeProvider`, `AuthProvider` and
 * the other per-service providers under the same names, props and defaults.
 *
 * A provider component sets its services in Svelte context for the components below it, so an
 * app can wrap its root layout, a subtree or a test mount in one. `setMoleculeContext` sets the
 * same services from the root layout's script instead, without the session hold.
 *
 * Svelte sets context once, when the providing component initializes. When a service prop
 * changes to another object, the provider re-creates the tree below it, so every component
 * reads the new service; React keeps that tree's state across the change instead.
 *
 * @module
 */

import type { I18nProvider as CoreI18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider as CoreLoggerProvider } from '@molecule/app-logger'
import type { StateProvider as CoreStateProvider } from '@molecule/app-state'
import type { StorageProvider as CoreStorageProvider } from '@molecule/app-storage'
import type { ThemeProvider as CoreThemeProvider } from '@molecule/app-theme'

import AuthProviderComponent from './AuthProvider.svelte'
import ChatProviderComponent from './ChatProvider.svelte'
import EditorProviderComponent from './EditorProvider.svelte'
import HttpProviderComponent from './HttpProvider.svelte'
import I18nProviderComponent from './I18nProvider.svelte'
import LoggerProviderComponent from './LoggerProvider.svelte'
import MoleculeProviderComponent from './MoleculeProvider.svelte'
import PreviewProviderComponent from './PreviewProvider.svelte'
import RouterProviderComponent from './RouterProvider.svelte'
import StateProviderComponent from './StateProvider.svelte'
import StorageProviderComponent from './StorageProvider.svelte'
import ThemeProviderComponent from './ThemeProvider.svelte'
import WorkspaceProviderComponent from './WorkspaceProvider.svelte'

/**
 * Combined provider for every molecule service, as `@molecule/app-react`'s `MoleculeProvider`.
 *
 * Only the services passed are provided, except `state`, which falls back to the state provider
 * bonded under `@molecule/app-state` (set by `setupAllDefaultBonds()` or a state bond) so
 * `useStore()` works without a `state` prop. Given `auth`, it renders its children only once
 * the session is decided (`awaitSession`, default true), with the `sessionFallback` snippet
 * meanwhile.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createJWTAuthClient } from '@molecule/app-auth'
 *   import { MoleculeProvider } from '@molecule/app-svelte'
 *   import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 *   import Routes from './Routes.svelte'
 *
 *   const authClient = createJWTAuthClient({ baseURL: '/api' })
 * </script>
 *
 * <MoleculeProvider auth={authClient} theme={themeProvider}>
 *   {#snippet sessionFallback()}<p>Restoring your session…</p>{/snippet}
 *   <Routes />
 * </MoleculeProvider>
 * ```
 */
export const MoleculeProvider = MoleculeProviderComponent

/**
 * Provider for authentication, as `@molecule/app-react`'s `AuthProvider`: it provides the
 * client and, unless `awaitSession` is `false`, renders its children only once the session is
 * decided (`SessionReady`), with the `sessionFallback` snippet meanwhile.
 */
export const AuthProvider = AuthProviderComponent

/**
 * Provider for state management, as `@molecule/app-react`'s `StateProvider`.
 */
export const StateProvider = StateProviderComponent

/**
 * The `@molecule/app-state` interface under its former name here.
 *
 * @deprecated `StateProvider` from `@molecule/app-svelte` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-state`.
 */
export type StateProvider = CoreStateProvider

/**
 * Provider for theming, as `@molecule/app-react`'s `ThemeProvider`.
 */
export const ThemeProvider = ThemeProviderComponent

/**
 * The `@molecule/app-theme` interface under its former name here.
 *
 * @deprecated `ThemeProvider` from `@molecule/app-svelte` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-theme`.
 */
export type ThemeProvider = CoreThemeProvider

/**
 * Provider for routing, as `@molecule/app-react`'s `RouterProvider`.
 */
export const RouterProvider = RouterProviderComponent

/**
 * Provider for internationalization, as `@molecule/app-react`'s `I18nProvider`.
 */
export const I18nProvider = I18nProviderComponent

/**
 * The `@molecule/app-i18n` interface under its former name here.
 *
 * @deprecated `I18nProvider` from `@molecule/app-svelte` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-i18n`.
 */
export type I18nProvider = CoreI18nProvider

/**
 * Provider for the HTTP client, as `@molecule/app-react`'s `HttpProvider`.
 */
export const HttpProvider = HttpProviderComponent

/**
 * Provider for storage, as `@molecule/app-react`'s `StorageProvider`.
 */
export const StorageProvider = StorageProviderComponent

/**
 * The `@molecule/app-storage` interface under its former name here.
 *
 * @deprecated `StorageProvider` from `@molecule/app-svelte` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-storage`.
 */
export type StorageProvider = CoreStorageProvider

/**
 * Provider for logging, as `@molecule/app-react`'s `LoggerProvider`.
 */
export const LoggerProvider = LoggerProviderComponent

/**
 * The `@molecule/app-logger` interface under its former name here.
 *
 * @deprecated `LoggerProvider` from `@molecule/app-svelte` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-logger`.
 */
export type LoggerProvider = CoreLoggerProvider

/**
 * Provider for AI chat, as `@molecule/app-react`'s `ChatProvider`.
 */
export const ChatProvider = ChatProviderComponent

/**
 * Provider for the IDE workspace, as `@molecule/app-react`'s `WorkspaceProvider`.
 */
export const WorkspaceProvider = WorkspaceProviderComponent

/**
 * Provider for the code editor, as `@molecule/app-react`'s `EditorProvider`.
 */
export const EditorProvider = EditorProviderComponent

/**
 * Provider for the live preview, as `@molecule/app-react`'s `PreviewProvider`.
 */
export const PreviewProvider = PreviewProviderComponent
