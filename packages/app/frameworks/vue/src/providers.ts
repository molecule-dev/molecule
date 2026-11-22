/**
 * Vue provider components, `@molecule/app-react`'s `MoleculeProvider`, `AuthProvider` and the
 * other per-service providers under the same names, props and defaults.
 *
 * A provider component provides its services to the components below it (`provide()` in its
 * setup), so an app can wrap its root, a subtree or a test mount in one. `moleculePlugin` and the
 * `create*Plugin` functions provide the same services to the whole app instead, without the
 * session hold.
 *
 * Vue provides a value once, when the providing component sets up. When a service prop changes
 * to another object, the provider remounts the tree below it, so every component reads the new
 * service; React keeps that tree's state across the change instead.
 *
 * @module
 */

import {
  defineComponent,
  type DefineSetupFnComponent,
  h,
  type InjectionKey,
  provide,
  renderSlot,
  type Slot,
  type SlotsType,
  type VNode,
} from 'vue'

import type { I18nProvider as CoreI18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider as CoreLoggerProvider } from '@molecule/app-logger'
import {
  getProvider as getStateProvider,
  hasProvider as hasStateProvider,
  type StateProvider as CoreStateProvider,
} from '@molecule/app-state'
import type { StorageProvider as CoreStorageProvider } from '@molecule/app-storage'
import type { ThemeProvider as CoreThemeProvider } from '@molecule/app-theme'

import {
  AuthKey,
  ChatKey,
  EditorKey,
  HttpKey,
  I18nKey,
  LoggerKey,
  PreviewKey,
  RouterKey,
  StateKey,
  StorageKey,
  ThemeKey,
  WorkspaceKey,
} from './injection-keys.js'
import { RoutedViewKey } from './routed-view-key.js'
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
  ProviderProps,
  RouterProviderProps,
  StateProviderProps,
  StorageProviderProps,
  ThemeProviderProps,
  WorkspaceProviderProps,
} from './types.js'

/** One service to provide: its injection key and the value. */
type ServiceEntry = readonly [InjectionKey<unknown>, unknown]

/** A number per object identity, so a changed service gives the provided tree a new key. */
const identities = new WeakMap<object, number>()
let nextIdentity = 0

/**
 * The identity number of a service value (0 for an absent one).
 *
 * @param value - A provided service, or `undefined`.
 * @returns The same number for the same object, a new one for another.
 */
function identityOf(value: unknown): number {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return 0
  const known = identities.get(value)
  if (known !== undefined) return known
  nextIdentity += 1
  identities.set(value, nextIdentity)
  return nextIdentity
}

/**
 * Provides its entries in setup and renders its default slot. Rendered under a key made from
 * the entries' identities, so a changed service sets it up again.
 */
const ProvidedServices = defineComponent<
  { entries: ServiceEntry[] },
  Record<never, never>,
  string,
  SlotsType<ProviderProps>
>(
  (props, { slots }) => {
    for (const [key, value] of props.entries) provide(key, value)
    return (): VNode => renderSlot(slots, 'default')
  },
  { name: 'MoleculeServices', props: ['entries'] },
)

/**
 * Renders `content` below the given services, set up again when one of them changes.
 *
 * @param entries - The services to provide; an absent value is left out.
 * @param content - The tree that reads them.
 * @returns The provided tree.
 */
function provideServices(entries: ServiceEntry[], content: Slot | undefined): VNode {
  const present = entries.filter(([, value]) => value !== undefined && value !== null)
  return h(
    ProvidedServices,
    { key: present.map(([, value]) => identityOf(value)).join(':'), entries: present },
    { default: () => (content ? content() : []) },
  )
}

/**
 * The tree, held by `SessionReady` (its `sessionFallback` slot shown meanwhile) when `hold`.
 *
 * @param hold - Whether to wait for the session.
 * @param content - The tree.
 * @param fallback - What shows while the session is loading.
 * @returns A slot rendering the held or plain tree.
 */
function heldContent(hold: boolean, content: Slot | undefined, fallback: Slot | undefined): Slot {
  return () =>
    hold
      ? [
          h(SessionReady, null, {
            default: () => content?.() ?? [],
            fallback: () => fallback?.() ?? [],
          }),
        ]
      : (content?.() ?? [])
}

/**
 * A component providing one service under `key` from its `prop`.
 *
 * @param name - The component name.
 * @param key - The injection key the composables read.
 * @param prop - The prop holding the service.
 * @param extra - Other props it declares (so they are not passed on as attributes).
 * @returns The provider component.
 */
function serviceProvider<
  P extends ProviderProps,
  K extends Exclude<keyof P, keyof ProviderProps> & string,
>(
  name: string,
  key: InjectionKey<NonNullable<P[K]>>,
  prop: K,
  extra: (Exclude<keyof P, keyof ProviderProps> & string)[] = [],
): DefineSetupFnComponent<
  Omit<P, keyof ProviderProps>,
  Record<never, never>,
  SlotsType<ProviderProps>
> {
  return defineComponent<
    Omit<P, keyof ProviderProps>,
    Record<never, never>,
    string,
    SlotsType<ProviderProps>
  >(
    (props, { slots }) =>
      (): VNode =>
        provideServices([[key, props[prop]]], slots.default),
    {
      name,
      props: [prop, ...extra],
    },
  )
}

/**
 * Provider for state management, as `@molecule/app-react`'s `StateProvider`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { StateProvider } from '@molecule/app-vue'
 * import { provider } from '@molecule/app-state-zustand'
 * </script>
 *
 * <template>
 *   <StateProvider :provider="provider"><App /></StateProvider>
 * </template>
 * ```
 */
export const StateProvider = serviceProvider<StateProviderProps, 'provider'>(
  'StateProvider',
  StateKey,
  'provider',
)
/**
 * The `@molecule/app-state` interface under its former name here.
 *
 * @deprecated `StateProvider` from `@molecule/app-vue` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-state`.
 */
export type StateProvider = CoreStateProvider

/**
 * Provider for authentication, as `@molecule/app-react`'s `AuthProvider`: it provides the
 * client and, unless `awaitSession` is `false`, renders its tree only once the session is
 * decided (`SessionReady`), with the `sessionFallback` slot meanwhile.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { AuthProvider } from '@molecule/app-vue'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 * </script>
 *
 * <template>
 *   <AuthProvider :client="authClient">
 *     <template #sessionFallback><p>Restoring your session…</p></template>
 *     <RouterView />
 *   </AuthProvider>
 * </template>
 * ```
 */
export const AuthProvider = defineComponent<
  Omit<AuthProviderProps, keyof ProviderProps | 'sessionFallback'>,
  Record<never, never>,
  string,
  SlotsType<Pick<AuthProviderProps, 'default' | 'sessionFallback'>>
>(
  (props, { slots }) =>
    (): VNode =>
      provideServices(
        [[AuthKey, props.client]],
        heldContent(props.awaitSession !== false, slots.default, slots.sessionFallback),
      ),
  { name: 'AuthProvider', props: ['client', 'awaitSession'] },
)

/**
 * Provider for theming, as `@molecule/app-react`'s `ThemeProvider`.
 */
export const ThemeProvider = serviceProvider<ThemeProviderProps, 'provider'>(
  'ThemeProvider',
  ThemeKey,
  'provider',
  ['initialTheme'],
)
/**
 * The `@molecule/app-theme` interface under its former name here.
 *
 * @deprecated `ThemeProvider` from `@molecule/app-vue` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-theme`.
 */
export type ThemeProvider = CoreThemeProvider

/**
 * Provider for routing, as `@molecule/app-react`'s `RouterProvider`: the router and, from a
 * routing bond that has one, the routed view `RoutedView` renders (`null` without one). A
 * routing bond renders it for the app, so app code rarely mounts it by hand.
 */
export const RouterProvider = defineComponent<
  Omit<RouterProviderProps, keyof ProviderProps>,
  Record<never, never>,
  string,
  SlotsType<ProviderProps>
>(
  (props, { slots }) =>
    (): VNode => {
      const view = props.routedView ?? null
      const entries: ServiceEntry[] = [[RoutedViewKey, view]]
      if (props.router) entries.unshift([RouterKey, props.router])
      return h(
        ProvidedServices,
        { key: `${identityOf(props.router)}:${identityOf(view)}`, entries },
        { default: () => slots.default?.() ?? [] },
      )
    },
  { name: 'RouterProvider', props: ['router', 'routedView'] },
)

/**
 * Provider for internationalization, as `@molecule/app-react`'s `I18nProvider`.
 */
export const I18nProvider = serviceProvider<I18nProviderProps, 'provider'>(
  'I18nProvider',
  I18nKey,
  'provider',
)
/**
 * The `@molecule/app-i18n` interface under its former name here.
 *
 * @deprecated `I18nProvider` from `@molecule/app-vue` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-i18n`.
 */
export type I18nProvider = CoreI18nProvider

/**
 * Provider for the HTTP client, as `@molecule/app-react`'s `HttpProvider`.
 */
export const HttpProvider = serviceProvider<HttpProviderProps, 'client'>(
  'HttpProvider',
  HttpKey,
  'client',
)

/**
 * Provider for storage, as `@molecule/app-react`'s `StorageProvider`.
 */
export const StorageProvider = serviceProvider<StorageProviderProps, 'provider'>(
  'StorageProvider',
  StorageKey,
  'provider',
)
/**
 * The `@molecule/app-storage` interface under its former name here.
 *
 * @deprecated `StorageProvider` from `@molecule/app-vue` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-storage`.
 */
export type StorageProvider = CoreStorageProvider

/**
 * Provider for logging, as `@molecule/app-react`'s `LoggerProvider`.
 */
export const LoggerProvider = serviceProvider<LoggerProviderProps, 'provider'>(
  'LoggerProvider',
  LoggerKey,
  'provider',
)
/**
 * The `@molecule/app-logger` interface under its former name here.
 *
 * @deprecated `LoggerProvider` from `@molecule/app-vue` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-logger`.
 */
export type LoggerProvider = CoreLoggerProvider

/**
 * Provider for AI chat, as `@molecule/app-react`'s `ChatProvider`.
 */
export const ChatProvider = serviceProvider<ChatProviderProps, 'provider'>(
  'ChatProvider',
  ChatKey,
  'provider',
)

/**
 * Provider for the IDE workspace, as `@molecule/app-react`'s `WorkspaceProvider`.
 */
export const WorkspaceProvider = serviceProvider<WorkspaceProviderProps, 'provider'>(
  'WorkspaceProvider',
  WorkspaceKey,
  'provider',
)

/**
 * Provider for the code editor, as `@molecule/app-react`'s `EditorProvider`.
 */
export const EditorProvider = serviceProvider<EditorProviderProps, 'provider'>(
  'EditorProvider',
  EditorKey,
  'provider',
)

/**
 * Provider for the live preview, as `@molecule/app-react`'s `PreviewProvider`.
 */
export const PreviewProvider = serviceProvider<PreviewProviderProps, 'provider'>(
  'PreviewProvider',
  PreviewKey,
  'provider',
)

/**
 * Combined provider for every molecule service, as `@molecule/app-react`'s `MoleculeProvider`.
 *
 * Only the services passed are provided, except `state`, which falls back to the state provider
 * bonded under `@molecule/app-state` (set by `setupAllDefaultBonds()` or a state bond) so
 * `useStore()` works without a `state` prop. Given `auth`, it renders the app only once the
 * session is decided (`awaitSession`, default true), with the `sessionFallback` slot meanwhile.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { MoleculeProvider } from '@molecule/app-vue'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 * </script>
 *
 * <template>
 *   <MoleculeProvider :auth="authClient" :theme="themeProvider">
 *     <template #sessionFallback><p>Restoring your session…</p></template>
 *     <RouterView />
 *   </MoleculeProvider>
 * </template>
 * ```
 */
export const MoleculeProvider = defineComponent<
  Omit<MoleculeProviderProps, keyof ProviderProps | 'sessionFallback'>,
  Record<never, never>,
  string,
  SlotsType<Pick<MoleculeProviderProps, 'default' | 'sessionFallback'>>
>(
  (props, { slots }) =>
    (): VNode => {
      // A `state` prop wins; otherwise the BONDED state provider, the singleton every
      // `createStore()` reads, so `useStore()` in a scaffolded app needs no `state` prop.
      const state: CoreStateProvider | undefined =
        props.state ?? (hasStateProvider() ? getStateProvider() : undefined)
      const entries: ServiceEntry[] = [
        [StateKey, state],
        [AuthKey, props.auth],
        [ThemeKey, props.theme],
        [RouterKey, props.router],
        [I18nKey, props.i18n],
        [HttpKey, props.http],
        [StorageKey, props.storage],
        [LoggerKey, props.logger],
        [ChatKey, props.chat],
        [WorkspaceKey, props.workspace],
        [EditorKey, props.editor],
        [PreviewKey, props.preview],
      ]
      // The session hold is innermost: its fallback still sees every service.
      return provideServices(
        entries,
        heldContent(
          props.awaitSession !== false && Boolean(props.auth),
          slots.default,
          slots.sessionFallback,
        ),
      )
    },
  {
    name: 'MoleculeProvider',
    props: [
      'state',
      'auth',
      'awaitSession',
      'theme',
      'router',
      'i18n',
      'http',
      'storage',
      'logger',
      'chat',
      'workspace',
      'editor',
      'preview',
    ],
  },
)
