/**
 * Solid binding conformance adapter: `createSolidBindingAdapter({ exports,
 * binding })` mounts the kit's hook cases with Solid. `@molecule/app-solid`
 * passes its own exports; a Solid feature package passes the binding's exports
 * plus its own, so its cases can mount the binding's hooks and its own.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a primitive of the same name, called in a component
 *   under `MoleculeProvider` (Solid's composition root, `config` = the services).
 * - A value field may be an accessor (a function returning the value); a method is a plain
 *   function. React's result shape tells which is which, so an accessor is never a method.
 * - An `args` step re-mounts the host with the new arguments: a component body runs once.
 *   A `reactiveArgs` hook (`useChat`) gets its options as an accessor instead, set on the
 *   same mount.
 * - A component export (`SessionReady`) takes React's string props as the same props
 *   (`children`, `fallback`).
 *
 * @module
 */

import {
  type Component,
  createComponent,
  createSignal,
  type JSX,
  type ParentComponent,
} from 'solid-js'
import { render } from 'solid-js/web'

import {
  type BindingAdapter,
  type BindingServices,
  callHook,
  type MountedHook,
} from '../bindings/index.js'
import { settle } from '../ui/index.js'

/** What the adapter needs from `@molecule/app-solid` (the package under test passes the module). */
export interface SolidBinding {
  /** Solid's composition root: the case's services become its `config` providers. */
  MoleculeProvider: ParentComponent<{
    /** The case's services (`MoleculeConfig` holds the same providers). */
    config: Partial<BindingServices>
  }>
  /** Clears the chat stores' module-level state between cases. */
  resetChatStoresForTests(): void
}

/** Options for {@link createSolidBindingAdapter}. */
export interface SolidBindingAdapterOptions {
  /** Every hook and component the cases may mount or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-solid`. */
  binding: SolidBinding
}

/**
 * A Solid binding adapter over one export map.
 *
 * @param options - The exports to mount and the Solid binding.
 * @returns The adapter.
 */
export function createSolidBindingAdapter({
  exports: exportsOf,
  binding,
}: SolidBindingAdapterOptions): BindingAdapter {
  const { MoleculeProvider, resetChatStoresForTests } = binding

  return {
    name: 'solid',
    reset: () => {
      resetChatStoresForTests()
      // React resets its models cache too; present once this binding ports useAIModels.
      const resetModels = exportsOf.resetAIModelsCache
      if (typeof resetModels === 'function') resetModels()
    },
    has: (name) => typeof exportsOf[name] !== 'undefined',
    async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
      const container = document.createElement('div')
      document.body.appendChild(container)
      let result: unknown
      let dispose: (() => void) | null = null
      // A reactiveArgs hook reads its options from this signal for the life of one mount.
      const [reactiveOptions, setReactiveOptions] = createSignal<unknown>(args[0], {
        equals: false,
      })
      const start = (current: unknown[]): void => {
        const Host: Component = () => {
          const target = exportsOf[hook]
          if (options.render === 'text') {
            return createComponent(target as Component<Record<string, unknown>>, {
              ...(current[0] as Record<string, unknown>),
            })
          }
          result = callHook(
            target,
            options.reactiveArgs ? [reactiveOptions, ...current.slice(1)] : current,
          )
          return null
        }
        const config: Partial<BindingServices> = { ...services }
        dispose = render(
          () =>
            createComponent(MoleculeProvider, {
              config,
              get children(): JSX.Element {
                return createComponent(Host, {})
              },
            }),
          container,
        )
      }
      const flush = async (): Promise<void> => {
        await settle()
      }
      start(args)
      return {
        result: () => (options.render === 'text' ? (container.textContent ?? '') : result),
        // Solid's reactive value is an accessor; the shape only asks `read` for value fields.
        read: (value) => (typeof value === 'function' ? (value as () => unknown)() : value),
        setArgs: async (next) => {
          if (options.reactiveArgs) {
            // A function value would be read as an updater; the options are an object.
            setReactiveOptions(() => next[0])
          } else {
            dispose?.()
            start(next)
          }
          await flush()
        },
        flush,
        unmount: async () => {
          dispose?.()
          dispose = null
          container.remove()
        },
      }
    },
  }
}
