/**
 * React reference adapter for binding cases: mounts a host component that
 * calls one hook under `MoleculeProvider`. `createReactBindingAdapter(exports)`
 * looks hooks up in `exports`: `@molecule/app-react` itself, or it plus a React
 * feature package that exports hooks (`@molecule/app-query-react`).
 *
 * @module
 */

import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

import * as ReactBindings from '@molecule/app-react'

import {
  type BindingAdapter,
  type BindingServices,
  callHook,
  type MountedHook,
  type MountOptions,
} from '../bindings/index.js'
import { settle } from '../ui/index.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Where the host writes the hook's latest result. */
interface Slot {
  result: unknown
}

/** Calls the hook on every render and stores its result. */
function Host({ fn, args, into }: { fn: unknown; args: unknown[]; into: Slot }): null {
  into.result = callHook(fn, args)
  return null
}

const tree = (
  exportsOf: Record<string, unknown>,
  hook: string,
  args: unknown[],
  services: Partial<BindingServices>,
  into: Slot,
  options: MountOptions,
): ReactElement =>
  createElement(ReactBindings.MoleculeProvider, {
    ...services,
    awaitSession: false,
    children:
      options.render === 'text'
        ? // A component export renders with args[0] as props; its string props are text slots.
          createElement(exportsOf[hook] as (props: object) => ReactElement, {
            ...(args[0] as object),
          })
        : createElement(Host, { fn: exportsOf[hook], args, into }),
  })

/**
 * Builds a React binding adapter over an export map.
 *
 * @param exportsOf - Where hooks are looked up: `@molecule/app-react`, plus a feature package's exports.
 * @returns The adapter.
 */
export function createReactBindingAdapter(exportsOf: Record<string, unknown>): BindingAdapter {
  return {
    name: 'react',
    reset: () => {
      ReactBindings.resetChatStoresForTests()
      ReactBindings.resetAIModelsCache()
    },
    has: (name) => typeof exportsOf[name] !== 'undefined',
    async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const root = createRoot(container)
      const slot: Slot = { result: undefined }
      let current = args
      await act(async () => {
        root.render(tree(exportsOf, hook, current, services, slot, options))
      })
      return {
        result: () => (options.render === 'text' ? (container.textContent ?? '') : slot.result),
        read: (value) => value,
        setArgs: async (next) => {
          current = next
          await act(async () => {
            root.render(tree(exportsOf, hook, current, services, slot, options))
          })
        },
        flush: async () => {
          await settle((work) => act(work))
        },
        wrap: async (step) => {
          await act(step)
        },
        unmount: async () => {
          await act(async () => {
            root.unmount()
          })
          container.remove()
        },
      }
    },
  }
}

/** The React reference adapter over `@molecule/app-react`. */
export const reactBindingAdapter: BindingAdapter = createReactBindingAdapter(
  ReactBindings as unknown as Record<string, unknown>,
)
