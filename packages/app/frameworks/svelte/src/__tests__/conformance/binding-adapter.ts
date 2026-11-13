/**
 * Svelte binding conformance adapter (Svelte 5).
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a function of the same name, called during component
 *   init under `setMoleculeContext` (Svelte's composition root).
 * - A value field may be a store (the store contract: `subscribe` calls back at once with the
 *   current value); a method is a plain function. The adapter keeps each store of the result
 *   subscribed while the host is mounted, as a component's `$store` read does.
 * - An `args` step re-mounts the host with the new arguments: component init runs once.
 *   A `reactiveArgs` hook (`useChat`) gets its options as a writable store instead, set on
 *   the same mount.
 * - A component export (`SessionReady`) takes React's string props as snippets of the same
 *   name (`children`, `fallback`).
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'

import {
  type BindingAdapter,
  callHook,
  type MountedHook,
} from '@molecule/app-framework-conformance/bindings'
import { settle } from '@molecule/app-framework-conformance/ui'

import * as SvelteBindings from '../../index.js'
import Host from './Host.svelte'

const exportsOf = SvelteBindings as unknown as Record<string, unknown>

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
 */
class StoreReader {
  private readonly live = new Map<object, { value: unknown; stop: unknown }>()
  private readonly notStores = new WeakSet<object>()

  /**
   * Subscribes to a value if it is a store not yet subscribed.
   *
   * @param value - A result or result field.
   */
  track(value: unknown): void {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return
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

/** The Svelte binding adapter. */
export const svelteBindingAdapter: BindingAdapter = {
  name: 'svelte',
  reset: () => {
    SvelteBindings.resetChatStoresForTests()
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
    // A reactiveArgs hook reads its options from this store for the life of one mount.
    const reactiveOptions = writable<unknown>(args[0])
    let stores = new StoreReader()
    const config = { ...services }
    const start = (current: unknown[]): void => {
      stores = new StoreReader()
      if (options.render === 'text') {
        const props = Object.fromEntries(
          Object.entries((current[0] as Record<string, unknown>) ?? {}).map(([name, value]) => [
            name,
            typeof value === 'string' ? textSnippet(value) : value,
          ]),
        )
        instance = mount(Host, {
          target: container,
          props: {
            config,
            component: exportsOf[hook] as Component<Record<string, unknown>>,
            props,
          },
        })
      } else {
        instance = mount(Host, {
          target: container,
          props: {
            config,
            run: () => {
              result = callHook(
                exportsOf[hook],
                options.reactiveArgs ? [reactiveOptions, ...current.slice(1)] : current,
              )
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
      result: () => (options.render === 'text' ? (container.textContent ?? '') : result),
      read: (value) => stores.read(value),
      setArgs: async (next) => {
        if (options.reactiveArgs) {
          reactiveOptions.set(next[0])
        } else {
          await stop()
          start(next)
        }
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
