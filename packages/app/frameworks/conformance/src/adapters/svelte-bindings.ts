/**
 * Svelte binding conformance adapter: `createSvelteBindingAdapter({ exports,
 * binding })` calls the kit's hook cases with a Svelte binding's exports.
 * `@molecule/app-svelte` passes its own exports; a Svelte feature package
 * passes the binding's exports plus its own, so the same cases run over the
 * bigger map.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a function of the same name, called during component
 *   init under `setMoleculeContext` (Svelte's composition root).
 * - A value field may be a store (the store contract: `subscribe` calls back at once with the
 *   current value); a method is a plain function. The adapter keeps each store of the result
 *   subscribed while the host is mounted, as a component's `$store` read does.
 * - A hook whose arguments change (a `reactiveArgs` family) gets every argument as a writable
 *   store (`T | Readable<T>`), and an `args` step sets the stores on the same mount: component
 *   init runs once and the hook follows its reactive arguments, as React's hook follows a
 *   re-render.
 * - A component export (`SessionReady`) takes React's string props as snippets of the same
 *   name (`children`, `fallback`).
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient } from '@molecule/app-auth'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { WorkspaceProvider } from '@molecule/app-ide'
import type { PreviewProvider } from '@molecule/app-live-preview'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import {
  type BindingAdapter,
  callHook,
  type MountedHook,
  reactiveSources,
  requireSources,
} from '../bindings/index.js'
import { settle } from '../ui/index.js'
import Host from './svelte-bindings/Host.svelte'

/**
 * The providers the binding's composition root passes into Svelte context (the
 * shape its `setMoleculeContext` takes), as the kit sees it structurally.
 */
export interface SvelteMoleculeConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
  /** The AI chat provider useChat and useChatProvider use. */
  chat?: ChatProvider
  /** The IDE workspace provider useWorkspace and useWorkspaceProvider use. */
  workspace?: WorkspaceProvider
  /** The code editor provider useEditor and useEditorProvider use. */
  editor?: EditorProvider
  /** The live preview provider usePreview and usePreviewProvider use. */
  preview?: PreviewProvider
}

/** What the adapter needs from `@molecule/app-svelte` (the package under test passes the module). */
export interface SvelteBinding {
  /**
   * Sets every provider in Svelte context (the binding's composition root);
   * the host calls it once per mount with the case's services.
   *
   * @param config - The services to provide.
   */
  setMoleculeContext(config: SvelteMoleculeConfig): void
  /** Sets the explicitly selected chat provider. */
  setChatContext?(provider: ChatProvider): void
  /**
   * Sets the router in Svelte context with a routing bond's routed view; the host calls it for a
   * case with a `routedView`.
   *
   * @param router - The case's router.
   * @param options - The routed view.
   * @param options.routedView - The component the routing bond renders for the matched child route.
   */
  setRouterContext(
    router: NonNullable<SvelteMoleculeConfig['router']>,
    options?: { routedView?: Component },
  ): void
}

/** Options for {@link createSvelteBindingAdapter}. */
export interface SvelteBindingAdapterOptions {
  /** Every hook and component the cases may call or render. */
  exports: Record<string, unknown>
  /** `@molecule/app-svelte`. */
  binding: SvelteBinding
}

/** Escapes text for a raw snippet's markup. */
const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** A snippet rendering one text node inside a span (raw snippets render exactly one element). */
const textSnippet = (text: string): ReturnType<typeof createRawSnippet> =>
  createRawSnippet(() => ({ render: () => `<span>${escapeHtml(text)}</span>` }))

/** Ends a store subscription (a function, or an RxJS-style `{ unsubscribe }`). */
const stopSubscription = (stop: unknown): void => {
  if (typeof stop === 'function') stop()
  else (stop as { unsubscribe?: () => void } | undefined)?.unsubscribe?.()
}

/**
 * The stores of one mounted result, subscribed for as long as the host is mounted, the way
 * a component's `$store` reads are (a store may only be current while it has a subscriber).
 * A store is anything whose `subscribe` calls back at once with the current value (the
 * Svelte store contract); an object whose `subscribe` does not (a router) is not one.
 *
 * Injected service objects are never probed: several of them carry a `subscribe`
 * method, and probing one would call it — recording a service call and a
 * listener the binding itself never makes (React's `useWorkspaceProvider`
 * returns the provider object untouched, and so must every framework). The
 * kit's own README excludes such objects from the store contract; identifying
 * them by identity (they are exactly the services the composition root passed)
 * is the only way to probe nothing the binding did not create.
 */
class StoreReader {
  private readonly live = new Map<object, { value: unknown; stop: unknown }>()
  private readonly notStores = new WeakSet<object>()
  private readonly services: ReadonlySet<unknown>

  /**
   * Creates a reader that never subscribes to the given services.
   *
   * @param services - The service objects the composition root passed; never probed.
   */
  constructor(services: ReadonlySet<unknown>) {
    this.services = services
  }

  /**
   * Subscribes to a value if it is a store not yet subscribed.
   *
   * @param value - A result or result field.
   */
  track(value: unknown): void {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return
    if (this.services.has(value)) return
    const key = value as object
    if (this.live.has(key) || this.notStores.has(key)) return
    const subscribe = (value as { subscribe?: unknown }).subscribe
    if (typeof subscribe !== 'function') return
    let called = false
    const entry = { value: undefined as unknown, stop: undefined as unknown }
    entry.stop = (subscribe as (run: (v: unknown) => void) => unknown).call(value, (v: unknown) => {
      called = true
      entry.value = v
    })
    if (called) this.live.set(key, entry)
    else {
      stopSubscription(entry.stop)
      this.notStores.add(key)
    }
  }

  /**
   * Subscribes to the result and to each of its fields.
   *
   * @param result - The hook's result.
   */
  trackResult(result: unknown): void {
    this.track(result)
    if (result && typeof result === 'object' && !this.live.has(result)) {
      for (const field of Object.values(result)) this.track(field)
    }
  }

  /**
   * A store's latest value; anything else as it is.
   *
   * @param value - A result or result field.
   * @returns The value.
   */
  read(value: unknown): unknown {
    this.track(value)
    const entry =
      value && (typeof value === 'object' || typeof value === 'function')
        ? this.live.get(value as object)
        : undefined
    return entry ? entry.value : value
  }

  /** Ends every subscription. */
  stopAll(): void {
    for (const entry of this.live.values()) stopSubscription(entry.stop)
    this.live.clear()
  }
}

/**
 * A Svelte binding adapter over one export map.
 *
 * @param options - The exports to call and the Svelte binding.
 * @returns The adapter.
 */
export function createSvelteBindingAdapter({
  exports: exportsOf,
  binding,
}: SvelteBindingAdapterOptions): BindingAdapter {
  const { setMoleculeContext, setChatContext } = binding

  return {
    name: 'svelte',
    reset: () => {
      const resetChatStores = exportsOf.resetChatStoresForTests
      if (typeof resetChatStores === 'function') resetChatStores()
      // React resets its models cache too; present once this binding ports useAIModels.
      const resetModels = exportsOf.resetAIModelsCache
      if (typeof resetModels === 'function') resetModels()
    },
    has: (name) => typeof exportsOf[name] !== 'undefined',
    async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
      const container = document.createElement('div')
      document.body.appendChild(container)
      let result: unknown
      let instance: Record<string, unknown> | null = null
      // A reactiveArgs hook reads each argument from its store for the life of the mount.
      const sources = reactiveSources(hook, args, options, (value) => writable<unknown>(value))
      const serviceObjects = new Set(Object.values(services))
      let stores = new StoreReader(serviceObjects)
      const config = { ...services }
      const start = (current: unknown[]): void => {
        stores = new StoreReader(serviceObjects)
        if (options.render) {
          const props = Object.fromEntries(
            Object.entries((current[0] as Record<string, unknown>) ?? {}).map(([name, value]) => [
              name,
              typeof value === 'string' ? textSnippet(value) : value,
            ]),
          )
          if (options.render === 'root') {
            // The composition root as an app mounts it: the services are its props, nothing around it.
            instance = mount(exportsOf[hook] as Component<Record<string, unknown>>, {
              target: container,
              props: { ...services, ...props },
            })
          } else
            instance = mount(Host, {
              target: container,
              props: {
                config,
                setMoleculeContext,
                setChatContext,
                setRouterContext: binding.setRouterContext,
                routedView: options.routedView,
                component: exportsOf[hook] as Component<Record<string, unknown>>,
                props,
              },
            })
        } else {
          instance = mount(Host, {
            target: container,
            props: {
              config,
              setMoleculeContext,
              setChatContext,
              setRouterContext: binding.setRouterContext,
              routedView: options.routedView,
              run: () => {
                result = callHook(exportsOf[hook], sources ?? current)
                stores.trackResult(result)
              },
            },
          })
        }
        flushSync()
      }
      const stop = async (): Promise<void> => {
        stores.stopAll()
        if (instance) await unmount(instance)
        instance = null
      }
      const flush = async (): Promise<void> => {
        flushSync()
        await settle()
        flushSync()
      }
      start(args)
      return {
        result: () => (options.render ? (container.textContent ?? '') : result),
        read: (value) => stores.read(value),
        setArgs: async (next) => {
          for (const [index, source] of requireSources(hook, sources).entries())
            source.set(next[index])
          await flush()
        },
        flush,
        unmount: async () => {
          await stop()
          container.remove()
        },
      }
    },
  }
}
