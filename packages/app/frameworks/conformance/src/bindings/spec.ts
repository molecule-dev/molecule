/**
 * Framework-neutral description of a framework-binding hook case and of what
 * each framework adapter returns for it.
 *
 * A case calls one `@molecule/app-react` hook (`useAuth`, `useForm`, …) inside
 * a component, under the same services in every framework, then runs steps:
 * call a returned method, change a service from outside, advance timers,
 * re-render with new arguments, unmount. After mount and after every step the
 * kit snapshots the hook's result, unwrapping each framework's reactive
 * primitive (a Vue ref, a Solid accessor, a Svelte store, an Angular signal),
 * and records every service call and callback call. Every framework must
 * produce React's snapshots and calls.
 *
 * @module
 */

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { MoleculeProviderProps } from '@molecule/app-react'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import type { CaseContext, RecordedCall } from '../ui/spec.js'
import type { AsyncSeed } from './fakes/async.js'
import type { AuthFlowsSeed } from './fakes/auth-flows.js'
import type { ChatSeed } from './fakes/chat.js'
import type { CoreSeed } from './fakes/core.js'
import type { NativeSeed } from './fakes/native.js'

/**
 * A function argument, created by the kit and recorded under `$fn`.
 *
 * - default: returns `returns` (undefined when omitted);
 * - `resolve` / `reject`: returns a promise resolved with `resolve` or rejected
 *   with `new Error(reject)`;
 * - `defer: true`: returns a promise that stays pending until a `settle` step
 *   names this function.
 */
export interface FnArg {
  $fn: string
  returns?: unknown
  resolve?: unknown
  reject?: string
  defer?: boolean
}

/** A scripted HTTP response, matched by method and URL in order. */
export interface HttpScript {
  method: string
  url: string
  status?: number
  data?: unknown
  /** Response headers (lowercase names). */
  headers?: Record<string, string>
  /** Reject with a network error (no response) instead of answering. */
  networkError?: string
  /** Stay pending until an `http` step answers it. */
  defer?: boolean
}

/** Auth operations a case can make fail (`authErrors: { login: 'Invalid credentials' }`). */
export type AuthOperation =
  | 'login'
  | 'register'
  | 'logout'
  | 'refresh'
  | 'requestPasswordReset'
  | 'confirmPasswordReset'
  | 'updateProfile'
  | 'changePassword'

/** Everything a binding case can seed, in addition to the UI case context. */
export interface BindingContext extends CaseContext {
  /** Initial storage contents (`key` → stored value). */
  storage?: Record<string, unknown>
  /** HTTP responses, consumed in order per method + URL. */
  http?: HttpScript[]
  /** Auth operations that reject with `new Error(message)`. */
  authErrors?: Partial<Record<AuthOperation, string>>
  /**
   * Translations per locale. The i18n provider knows `en` (the default), `fr`,
   * `de` and `ar` (right-to-left); a `locale` step may switch to any of them.
   */
  translations?: Partial<Record<'en' | 'fr' | 'de' | 'ar', Record<string, string>>>
  /** Seeds for the area fakes (`chat`, `native`, …); each `src/bindings/fakes/<area>.ts` adds its key. */
  areas?: AreaSeeds
}

/** Per-area seeds; each seed type lives in (and is owned by) its area's fakes module. */
export interface AreaSeeds {
  /** `fakes/auth-flows.ts`: browser location, `fetch`, popups. */
  authFlows?: AuthFlowsSeed
  /** `fakes/core.ts`: state stores, storage preferences, loggers. */
  core?: CoreSeed
  /** `fakes/async.ts`: HTTP lanes, promises, forms. */
  async?: AsyncSeed
  /** `fakes/native.ts`: device, platform, push, version, IDE panels, editor, preview, AI models. */
  native?: NativeSeed
  /** `fakes/chat.ts`: the chat provider and its streams. */
  chat?: ChatSeed
}

/** One step of a binding case. */
export type HookStep =
  /** Call a method of the result (`method` omitted: the result itself is the function). */
  | { type: 'call'; method?: string; args?: unknown[] }
  /** Re-render the host with new hook arguments. */
  | { type: 'args'; args: unknown[] }
  /** Advance fake timers (the case must set `fakeTimers`). */
  | { type: 'advance'; ms: number }
  /** Settle the oldest pending call of a deferred function argument. */
  | { type: 'settle'; fn: string; value?: unknown; error?: string }
  /** Answer the oldest deferred HTTP request for this method + URL. */
  | {
      type: 'http'
      method: string
      url: string
      status?: number
      data?: unknown
      networkError?: string
    }
  /** Change auth state from outside (another tab, a token refresh). */
  | {
      type: 'auth'
      status: 'authenticated' | 'unauthenticated' | 'loading' | 'unavailable'
      user?: Record<string, unknown>
    }
  /** Switch the i18n locale. */
  | { type: 'locale'; locale: string }
  /** Switch the theme mode from outside. */
  | { type: 'theme'; mode: 'light' | 'dark' }
  /** Navigate the router from outside. */
  | { type: 'navigate'; to: string }
  /** Write a storage key from outside. */
  | { type: 'storage'; key: string; value: unknown }
  /**
   * Call a named control that an area's fakes module registered (`chat.emit`,
   * `push.receive`, …); see `src/bindings/fakes/`. Its result is awaited.
   */
  | { type: 'control'; name: string; args?: unknown[] }
  /** Unmount the host (later snapshots show only calls; cleanup is observable through them). */
  | { type: 'unmount' }

/** One hook case. */
export interface HookCase {
  name: string
  /** Hook arguments. `FnArg` objects anywhere inside become recorded functions. */
  args?: unknown[]
  context?: BindingContext
  steps?: HookStep[]
  fakeTimers?: boolean
}

/** All cases for one hook export. */
export interface HookCases {
  /** The `@molecule/app-react` export name (`useAuth`). */
  hook: string
  cases: HookCase[]
}

/**
 * The shape of a hook's result, from React: a plain value, a function, or an
 * object whose fields are values or methods.
 */
export type ResultShape =
  | { kind: 'value' }
  | { kind: 'function' }
  | { kind: 'object'; fields: Record<string, 'value' | 'method'> }

/** What one framework produced for one case. */
export interface HookCaseResult {
  /** The result's shape (from the first snapshot). */
  shape: ResultShape
  /** Normalized result after mount and after each step (`null` after unmount). */
  snapshots: unknown[]
  /**
   * Service calls, `{ $fn }` calls and method outcomes, in order. A `call`
   * step's outcome is recorded as `=> method` with `{ returned }`, `{ threw }`,
   * or (when the promise settles) `{ resolved }` / `{ rejected }`.
   */
  calls: RecordedCall[]
  /** Subscriptions each service still holds after the host unmounted (a leak check). */
  listenersAfterUnmount: Record<string, number>
}

/** The live hook a framework adapter mounted. */
export interface MountedHook {
  /** The hook's current raw result, as the framework returned it. */
  result(): unknown
  /**
   * Reads the current plain value of one result value: unwraps the
   * framework's reactive primitive (Vue ref, Solid accessor, Svelte store,
   * Angular signal). Plain values are returned as they are.
   */
  read(value: unknown): unknown
  /** Re-renders the host with new hook arguments. */
  setArgs(args: unknown[]): Promise<void>
  /** Flushes the framework's pending work. */
  flush(): Promise<void>
  /** Runs one step inside the framework's update scope (React's `act`). */
  wrap?(step: () => Promise<void>): Promise<void>
  /** Unmounts the host. */
  unmount(): Promise<void>
}

/** Mounts hooks for one framework binding. */
export interface BindingAdapter {
  /** `react`, `vue`, `solid`, `svelte`, `angular`. */
  name: string
  /** Whether the binding exports this hook under its React name. */
  has(hook: string): boolean
  /**
   * Mounts a host component that calls `hook(...args)` under the services. An
   * export that is not a function (a constant) is the result itself.
   *
   * @param hook - The hook's export name.
   * @param args - The arguments (functions already created by the kit).
   * @param services - The case's services.
   * @param shape - React's result shape, when known (from the goldens), so an
   * adapter can tell a value accessor from a method.
   */
  mount(
    hook: string,
    args: unknown[],
    services: BindingServices,
    shape?: ResultShape,
  ): Promise<MountedHook>
}

/**
 * Services every framework's providers receive for a binding case. The last
 * four exist only when an area fakes module provides them (React's
 * `MoleculeProvider` takes all twelve).
 */
export interface BindingServices {
  i18n: I18nProvider
  router: Router
  theme: ThemeProvider
  auth: AuthClient<Record<string, unknown>>
  http: HttpClient
  storage: StorageProvider
  state: StateProvider
  logger: LoggerProvider
  chat?: MoleculeProviderProps['chat']
  workspace?: MoleculeProviderProps['workspace']
  editor?: MoleculeProviderProps['editor']
  preview?: MoleculeProviderProps['preview']
}

/**
 * What one area's fakes module adds to a case (see `src/bindings/fakes/`).
 */
export interface AreaFakes {
  /** Services the area provides through the framework's providers. */
  services?: Partial<BindingServices>
  /** Named controls a `control` step calls (name them `<area>.<action>`). */
  controls?: Record<string, (...args: unknown[]) => unknown>
  /** Subscriptions the area's services still hold (checked after unmount). */
  listeners?: () => Record<string, number>
  /** Undoes global changes (bonds, `window` stubs) after the case. */
  dispose?: () => void | Promise<void>
}

/**
 * Builds one area's fakes for a case.
 *
 * @param context - The case context.
 * @param record - Receives every call a hook makes on the area's services.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export type AreaFakesFactory = (
  context: BindingContext,
  record: (name: string, args: unknown[]) => void,
) => AreaFakes
