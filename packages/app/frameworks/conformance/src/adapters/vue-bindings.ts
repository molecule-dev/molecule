/**
 * Vue binding conformance adapter: `createVueBindingAdapter({ exports, binding })`
 * mounts the kit's hook cases with Vue. `@molecule/app-vue` passes its own
 * exports; a Vue feature package passes the binding's exports plus its own, so
 * its hooks run under the same cases.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a composable of the same name, called in `setup`.
 * - Services arrive through `moleculePlugin` (Vue's composition root).
 * - A value field may be a ref (read through `unref`); a method is a plain function.
 * - A hook whose arguments change (a `reactiveArgs` family) gets every argument as a ref
 *   (`MaybeRefOrGetter`), and an `args` step sets the refs on the same mount: a composable runs
 *   once per setup and follows its reactive arguments, as React's hook follows a re-render.
 * - A component export (`SessionReady`) takes React's string props as slots of the same name
 *   (`children` is the default slot).
 *
 * @module
 */

import {
  type App,
  type Component,
  createApp,
  defineComponent,
  h,
  isRef,
  nextTick,
  type Plugin,
  shallowRef,
} from 'vue'

import {
  type BindingAdapter,
  callHook,
  type MountedHook,
  reactiveSources,
  requireSources,
} from '../bindings/index.js'
import { settle } from '../ui/index.js'

/** What the adapter needs from `@molecule/app-vue` (the package under test passes the module). */
export interface VueBinding {
  /** The composition root: the mounted app receives the case's services through it. */
  moleculePlugin: Plugin
  /** Clears the binding's module-level chat stores before each case. */
  resetChatStoresForTests(): void
}

/** Options for {@link createVueBindingAdapter}. */
export interface VueBindingAdapterOptions {
  /** Every hook and component export the cases may mount or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-vue`. */
  binding: VueBinding
}

/**
 * A Vue binding adapter over one export map.
 *
 * @param options - The hook exports to run and the Vue binding.
 * @returns The adapter.
 */
export function createVueBindingAdapter({
  exports: exportsOf,
  binding,
}: VueBindingAdapterOptions): BindingAdapter {
  return {
    name: 'vue',
    reset: () => {
      binding.resetChatStoresForTests()
      // React resets its models cache too; present once this binding ports useAIModels.
      const resetModels = exportsOf.resetAIModelsCache
      if (typeof resetModels === 'function') resetModels()
    },
    has: (name) => typeof exportsOf[name] !== 'undefined',
    async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
      const container = document.createElement('div')
      document.body.appendChild(container)
      let result: unknown
      let app: App | null = null
      // A reactiveArgs hook reads each argument from its ref for the life of the mount.
      const sources = reactiveSources(hook, args, options, (value) => shallowRef<unknown>(value))
      const start = (current: unknown[]): void => {
        const Host =
          options.render === 'text'
            ? // A component export: each string prop is a text slot (`children` is the default slot).
              defineComponent({
                setup() {
                  const props = { ...(current[0] as Record<string, unknown>) }
                  const slots = Object.fromEntries(
                    Object.entries(props)
                      .filter(([, value]) => typeof value === 'string')
                      .map(([name, value]) => [
                        name === 'children' ? 'default' : name,
                        () => value,
                      ]),
                  )
                  const rest = Object.fromEntries(
                    Object.entries(props).filter(([, value]) => typeof value !== 'string'),
                  )
                  return () => h(exportsOf[hook] as Component, rest, slots)
                },
              })
            : defineComponent({
                setup() {
                  result = callHook(exportsOf[hook], sources ?? current)
                  return () => null
                },
              })
        app = createApp(Host)
        app.use(binding.moleculePlugin, services)
        app.mount(container)
      }
      const flush = async (): Promise<void> => {
        await nextTick()
        await settle()
        await nextTick()
      }
      start(args)
      return {
        result: () => (options.render === 'text' ? (container.textContent ?? '') : result),
        read: (value) => (isRef(value) ? value.value : value),
        setArgs: async (next) => {
          for (const [index, source] of requireSources(hook, sources).entries())
            source.value = next[index]
          await flush()
        },
        flush,
        unmount: async () => {
          app?.unmount()
          app = null
          container.remove()
        },
      }
    },
  }
}
