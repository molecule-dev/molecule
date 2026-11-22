/**
 * Solid provider components, `@molecule/app-react`'s `MoleculeProvider`, `AuthProvider` and the
 * other per-service providers under the same names, props and defaults.
 *
 * A Solid context provider reads its value once, when it is created. When a service prop
 * changes to another object, the provider re-creates the tree below it, so every component
 * reads the new service; React keeps that tree's state across the change instead.
 *
 * @module
 */

import { type Context, createComponent, createMemo, type JSX, Show } from 'solid-js'

import type { I18nProvider as CoreI18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider as CoreLoggerProvider } from '@molecule/app-logger'
import {
  getProvider as getBondedStateProvider,
  hasProvider as hasBondedStateProvider,
  type StateProvider as CoreStateProvider,
} from '@molecule/app-state'
import type { StorageProvider as CoreStorageProvider } from '@molecule/app-storage'
import type { ThemeProvider as CoreThemeProvider } from '@molecule/app-theme'

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
} from './context.js'
import { RoutedViewContext } from './routed-view-context.js'
import { SessionReady } from './session-ready.js'
import type {
  AuthProviderProps,
  ChatProviderProps,
  EditorProviderProps,
  HttpProviderProps,
  I18nProviderProps,
  LoggerProviderProps,
  MoleculeConfig,
  MoleculeConfigProviderProps,
  MoleculeProviderProps,
  PreviewProviderProps,
  RouterProviderProps,
  StateProviderProps,
  StorageProviderProps,
  ThemeProviderProps,
  WorkspaceProviderProps,
} from './types.js'

/** A number per object identity, so a replaced service gives the provided tree a new key. */
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
 * `inner` wrapped in `context`'s provider carrying `value`, or `inner` itself without a value.
 *
 * Providers are composed with explicit `createComponent` calls and getter props, the shape
 * `vite-plugin-solid` compiles JSX to. Solid evaluates children eagerly, so the getter
 * `children` chain is what keeps each level lazy: a child component's `useContext` would
 * otherwise read a context whose provider has not run yet.
 *
 * @param context - The context to provide.
 * @param value - Its value, or `undefined` to leave it out.
 * @param inner - Renders the tree below.
 * @returns Renders the provided tree.
 */
function wrap<T>(
  context: Context<T | undefined>,
  value: T | undefined,
  inner: () => JSX.Element,
): () => JSX.Element {
  if (value === undefined || value === null) return inner
  return () =>
    createComponent(context.Provider, {
      value,
      get children() {
        return inner()
      },
    })
}

/**
 * A provider of one service, whose tree is re-created when the service changes.
 *
 * @param context - The context the service's primitives read.
 * @param value - Reads the service prop.
 * @param children - Reads the children prop.
 * @returns The provided tree.
 */
function serviceProvider<T extends object>(
  context: Context<T | undefined>,
  value: () => T,
  children: () => JSX.Element,
): JSX.Element {
  return Show({
    get when() {
      return value()
    },
    keyed: true,
    children: (service: T) => wrap(context, service, children)(),
  })
}

/**
 * Provider for state management, as `@molecule/app-react`'s `StateProvider`.
 *
 * @param props - Component props (see {@link StateProviderProps}).
 * @returns The provided tree.
 */
export function StateProvider(props: StateProviderProps): JSX.Element {
  return serviceProvider(
    StateContext,
    () => props.provider,
    () => props.children,
  )
}
/**
 * The `@molecule/app-state` interface under its former name here.
 *
 * @deprecated `StateProvider` from `@molecule/app-solid` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-state`.
 */
export type StateProvider = CoreStateProvider

/**
 * Provider for authentication, alone.
 *
 * The counterpart of React's `AuthProvider`: it supplies the auth client under
 * its context and, by default, holds rendering until the client has decided the
 * session, so a returning visitor's first render reads the restored user
 * rather than `null`. Pass `awaitSession={false}` for a deliberately ungated
 * shell.
 *
 * @param props - Component props (see {@link AuthProviderProps}).
 * @returns The auth context provider wrapping the children.
 * @example
 * ```tsx
 * <AuthProvider client={authClient}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider<T = unknown>(props: AuthProviderProps<T>): JSX.Element {
  return Show({
    get when() {
      return props.client
    },
    keyed: true,
    children: (client) =>
      createComponent(AuthContext.Provider, {
        value: client,
        get children() {
          return props.awaitSession === false
            ? props.children
            : createComponent(SessionReady, {
                get fallback() {
                  return props.sessionFallback
                },
                get children() {
                  return props.children
                },
              })
        },
      }),
  })
}

/**
 * Provider for theming, as `@molecule/app-react`'s `ThemeProvider`.
 *
 * @param props - Component props (see {@link ThemeProviderProps}).
 * @returns The provided tree.
 */
export function ThemeProvider(props: ThemeProviderProps): JSX.Element {
  return serviceProvider(
    ThemeContext,
    () => props.provider,
    () => props.children,
  )
}
/**
 * The `@molecule/app-theme` interface under its former name here.
 *
 * @deprecated `ThemeProvider` from `@molecule/app-solid` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-theme`.
 */
export type ThemeProvider = CoreThemeProvider

/**
 * Provider for routing, as `@molecule/app-react`'s `RouterProvider`: the router and, from a
 * routing bond that has one, the routed view `RoutedView` renders (`null` without one). A
 * routing bond renders it for the app, so app code rarely mounts it by hand.
 *
 * @param props - Component props (see {@link RouterProviderProps}).
 * @returns The provided tree.
 */
export function RouterProvider(props: RouterProviderProps): JSX.Element {
  return serviceProvider(
    RouterContext,
    () => props.router,
    () =>
      createComponent(RoutedViewContext.Provider, {
        get value() {
          return props.routedView ?? null
        },
        get children() {
          return props.children
        },
      }),
  )
}

/**
 * Provider for internationalization, as `@molecule/app-react`'s `I18nProvider`.
 *
 * @param props - Component props (see {@link I18nProviderProps}).
 * @returns The provided tree.
 */
export function I18nProvider(props: I18nProviderProps): JSX.Element {
  return serviceProvider(
    I18nContext,
    () => props.provider,
    () => props.children,
  )
}
/**
 * The `@molecule/app-i18n` interface under its former name here.
 *
 * @deprecated `I18nProvider` from `@molecule/app-solid` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-i18n`.
 */
export type I18nProvider = CoreI18nProvider

/**
 * Provider for the HTTP client, as `@molecule/app-react`'s `HttpProvider`.
 *
 * @param props - Component props (see {@link HttpProviderProps}).
 * @returns The provided tree.
 */
export function HttpProvider(props: HttpProviderProps): JSX.Element {
  return serviceProvider(
    HttpContext,
    () => props.client,
    () => props.children,
  )
}

/**
 * Provider for storage, as `@molecule/app-react`'s `StorageProvider`.
 *
 * @param props - Component props (see {@link StorageProviderProps}).
 * @returns The provided tree.
 */
export function StorageProvider(props: StorageProviderProps): JSX.Element {
  return serviceProvider(
    StorageContext,
    () => props.provider,
    () => props.children,
  )
}
/**
 * The `@molecule/app-storage` interface under its former name here.
 *
 * @deprecated `StorageProvider` from `@molecule/app-solid` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-storage`.
 */
export type StorageProvider = CoreStorageProvider

/**
 * Provider for logging, as `@molecule/app-react`'s `LoggerProvider`.
 *
 * @param props - Component props (see {@link LoggerProviderProps}).
 * @returns The provided tree.
 */
export function LoggerProvider(props: LoggerProviderProps): JSX.Element {
  return serviceProvider(
    LoggerContext,
    () => props.provider,
    () => props.children,
  )
}
/**
 * The `@molecule/app-logger` interface under its former name here.
 *
 * @deprecated `LoggerProvider` from `@molecule/app-solid` is the provider component, as in
 * `@molecule/app-react`; import the interface from `@molecule/app-logger`.
 */
export type LoggerProvider = CoreLoggerProvider

/**
 * Provider for AI chat, as `@molecule/app-react`'s `ChatProvider`.
 *
 * @param props - Component props (see {@link ChatProviderProps}).
 * @returns The provided tree.
 */
export function ChatProvider(props: ChatProviderProps): JSX.Element {
  return serviceProvider(
    ChatContext,
    () => props.provider,
    () => props.children,
  )
}

/**
 * Provider for the IDE workspace, as `@molecule/app-react`'s `WorkspaceProvider`.
 *
 * @param props - Component props (see {@link WorkspaceProviderProps}).
 * @returns The provided tree.
 */
export function WorkspaceProvider(props: WorkspaceProviderProps): JSX.Element {
  return serviceProvider(
    WorkspaceContext,
    () => props.provider,
    () => props.children,
  )
}

/**
 * Provider for the code editor, as `@molecule/app-react`'s `EditorProvider`.
 *
 * @param props - Component props (see {@link EditorProviderProps}).
 * @returns The provided tree.
 */
export function EditorProvider(props: EditorProviderProps): JSX.Element {
  return serviceProvider(
    EditorContext,
    () => props.provider,
    () => props.children,
  )
}

/**
 * Provider for the live preview, as `@molecule/app-react`'s `PreviewProvider`.
 *
 * @param props - Component props (see {@link PreviewProviderProps}).
 * @returns The provided tree.
 */
export function PreviewProvider(props: PreviewProviderProps): JSX.Element {
  return serviceProvider(
    PreviewContext,
    () => props.provider,
    () => props.children,
  )
}

/**
 * Combined provider for every molecule service, as `@molecule/app-react`'s `MoleculeProvider`.
 *
 * Only the services passed are provided, except `state`, which falls back to the state provider
 * bonded under `@molecule/app-state` (set by `setupAllDefaultBonds()` or a state bond) so
 * `useStore()` works without a `state` prop. Given `auth`, it renders the app only once the
 * session is decided (`awaitSession`, default true), with `sessionFallback` meanwhile.
 *
 * The services may also come inside one `config` object, the deprecated form, with the same
 * defaults; mixing the two is a type error.
 *
 * @param props - Component props (see {@link MoleculeProviderProps}).
 * @returns The nested provider tree wrapping children.
 * @example
 * ```tsx
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * const authClient = createJWTAuthClient({ baseURL: '/api' })
 *
 * function App() {
 *   return (
 *     <MoleculeProvider auth={authClient} theme={themeProvider} sessionFallback={<p>Restoring…</p>}>
 *       <MyApp />
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 */
export function MoleculeProvider(
  props: MoleculeProviderProps | MoleculeConfigProviderProps,
): JSX.Element {
  // The flat props, or the deprecated `config` object. Never spread `props`: reading its
  // `children` getter here would create the children outside the providers.
  const given = (): MoleculeConfig => props.config ?? props
  const services = createMemo(() => {
    const s = given()
    return {
      // A `state` prop wins; otherwise the BONDED state provider, the singleton every
      // `createStore()` reads, so `useStore()` in a scaffolded app needs no `state` prop.
      state: s.state ?? (hasBondedStateProvider() ? getBondedStateProvider() : undefined),
      auth: s.auth,
      theme: s.theme,
      router: s.router,
      i18n: s.i18n,
      http: s.http,
      storage: s.storage,
      logger: s.logger,
      chat: s.chat,
      workspace: s.workspace,
      editor: s.editor,
      preview: s.preview,
    }
  })
  const key = createMemo(() => Object.values(services()).map(identityOf).join(':'))

  return Show({
    get when() {
      return key()
    },
    keyed: true,
    // Show takes a keyed render function only with its key parameter declared.
    children: (_key: string) => {
      const s = services()
      let render: () => JSX.Element = () => props.children

      // The session hold is innermost: its fallback still sees every service.
      if (s.auth && given().awaitSession !== false) {
        const inner = render
        render = () =>
          createComponent(SessionReady, {
            get fallback() {
              return given().sessionFallback
            },
            get children() {
              return inner()
            },
          })
      }

      render = wrap(ChatContext, s.chat, render)
      render = wrap(PreviewContext, s.preview, render)
      render = wrap(EditorContext, s.editor, render)
      render = wrap(WorkspaceContext, s.workspace, render)
      render = wrap(LoggerContext, s.logger, render)
      render = wrap(StorageContext, s.storage, render)
      render = wrap(HttpContext, s.http, render)
      render = wrap(I18nContext, s.i18n, render)
      render = wrap(RouterContext, s.router, render)
      render = wrap(ThemeContext, s.theme, render)
      render = wrap(AuthContext, s.auth, render)
      render = wrap(StateContext, s.state, render)
      return render()
    },
  })
}
