/**
 * React reference adapter for binding cases: mounts a host component that
 * calls one `@molecule/app-react` hook under `MoleculeProvider`.
 *
 * @module
 */

import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

import * as ReactBindings from '@molecule/app-react'

import type { BindingAdapter, BindingServices, MountedHook } from '../bindings/index.js'
import { settle } from '../ui/index.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const exportsOf = ReactBindings as unknown as Record<string, unknown>

/** Where the host writes the hook's latest result. */
interface Slot {
  result: unknown
}

/** Calls the hook on every render and stores its result. */
function Host({ hook, args, into }: { hook: string; args: unknown[]; into: Slot }): null {
  const target = exportsOf[hook]
  // A constant export (DEFAULT_AGENT_NAME) is its own result.
  into.result =
    typeof target === 'function' ? (target as (...a: unknown[]) => unknown)(...args) : target
  return null
}

const tree = (hook: string, args: unknown[], services: BindingServices, into: Slot): ReactElement =>
  createElement(ReactBindings.MoleculeProvider, {
    ...services,
    awaitSession: false,
    children: createElement(Host, { hook, args, into }),
  })

/** The React reference adapter. */
export const reactBindingAdapter: BindingAdapter = {
  name: 'react',
  has: (name) => typeof exportsOf[name] !== 'undefined',
  async mount(hook, args, services): Promise<MountedHook> {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const slot: Slot = { result: undefined }
    let current = args
    await act(async () => {
      root.render(tree(hook, current, services, slot))
    })
    return {
      result: () => slot.result,
      read: (value) => value,
      setArgs: async (next) => {
        current = next
        await act(async () => {
          root.render(tree(hook, current, services, slot))
        })
      },
      flush: async () => {
        await act(async () => {
          await settle()
        })
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
