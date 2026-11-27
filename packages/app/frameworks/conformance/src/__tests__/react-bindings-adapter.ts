/**
 * React reference adapter for binding cases: mounts a host component that
 * calls one hook under `MoleculeProvider`. `createReactBindingAdapter(exports)`
 * looks hooks up in `exports`: `@molecule/app-react` itself, or it plus a React
 * feature package that exports hooks (`@molecule/app-query-react`).
 *
 * @module
 */

import { act, createElement, Fragment, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

import * as ReactBindings from '@molecule/app-react'
import * as Models from '@molecule/app-react/ai-models'
import * as Chat from '@molecule/app-react/chat'
import * as Push from '@molecule/app-react/push'

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

/** One routed view per text, so a re-render keeps the same component (and its state). */
const routedViews = new Map<string, () => ReactElement>()

/**
 * The tree under the binding's `RouterProvider` with a routed view rendering the case's
 * `routedView` text, as a routing bond provides one; the tree itself when the case sets none.
 *
 * @param services - The case's services (the router among them).
 * @param options - The mount options (`routedView`).
 * @param inner - The tree.
 * @returns The tree to render.
 */
function underRoutedView(
  services: Partial<BindingServices>,
  options: MountOptions,
  inner: ReactElement,
): ReactElement {
  const text = options.routedView
  if (text === undefined || !services.router) return inner
  let view = routedViews.get(text)
  if (!view) {
    view = (): ReactElement => createElement(Fragment, null, text)
    routedViews.set(text, view)
  }
  return createElement(ReactBindings.RouterProvider, {
    router: services.router,
    routedView: view,
    children: inner,
  })
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
): ReactElement => {
  const { chat, ...baseServices } = services
  if (options.render === 'root') {
    // A root case's first argument supplies the root's props and children.
    return createElement(ReactBindings.MoleculeProvider, {
      ...baseServices,
      ...(args[0] as ReactBindings.MoleculeProviderProps),
    })
  }

  const child =
    options.render === 'text'
      ? createElement(exportsOf[hook] as (props: object) => ReactElement, {
          ...(args[0] as object),
        })
      : createElement(Host, { fn: exportsOf[hook], args, into })
  return createElement(ReactBindings.MoleculeProvider, {
    ...baseServices,
    awaitSession: false,
    children: underRoutedView(
      services,
      options,
      chat ? createElement(Chat.ChatProvider, { provider: chat, children: child }) : child,
    ),
  })
}

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
      Chat.resetChatStoresForTests()
      Models.resetAIModelsCache()
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
        result: () => (options.render ? (container.textContent ?? '') : slot.result),
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

/** All APIs the binding conformance suite exercises. */
export const reactBindingExports = { ...ReactBindings, ...Chat, ...Models, ...Push }

/** The React reference adapter over the root and feature entries. */
export const reactBindingAdapter: BindingAdapter = createReactBindingAdapter(reactBindingExports)
