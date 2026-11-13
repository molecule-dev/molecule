/**
 * Vue binding conformance adapter.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a composable of the same name, called in `setup`.
 * - Services arrive through `moleculePlugin` (Vue's composition root).
 * - A value field may be a ref (read through `unref`); a method is a plain function.
 * - An `args` step re-mounts the host with the new arguments: a composable runs once per setup.
 * - A component export (`SessionReady`) takes React's string props as slots of the same name
 *   (`children` is the default slot).
 *
 * @module
 */

import { type App, type Component, createApp, defineComponent, h, isRef, nextTick } from 'vue'

import {
  type BindingAdapter,
  callHook,
  type MountedHook,
} from '@molecule/app-framework-conformance/bindings'
import { settle } from '@molecule/app-framework-conformance/ui'

import * as VueBindings from '../../index.js'

const exportsOf = VueBindings as unknown as Record<string, unknown>

/** The Vue binding adapter. */
export const vueBindingAdapter: BindingAdapter = {
  name: 'vue',
  has: (name) => typeof exportsOf[name] !== 'undefined',
  async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
    const container = document.createElement('div')
    document.body.appendChild(container)
    let result: unknown
    let app: App | null = null
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
                    .map(([name, value]) => [name === 'children' ? 'default' : name, () => value]),
                )
                const rest = Object.fromEntries(
                  Object.entries(props).filter(([, value]) => typeof value !== 'string'),
                )
                return () => h(exportsOf[hook] as Component, rest, slots)
              },
            })
          : defineComponent({
              setup() {
                result = callHook(exportsOf[hook], current)
                return () => null
              },
            })
      app = createApp(Host)
      app.use(VueBindings.moleculePlugin, services)
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
        app?.unmount()
        start(next)
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
