// @vitest-environment jsdom

/**
 * Svelte's composition root (`setMoleculeContext`) and the state bond, porting
 * React's `MoleculeProvider` state cases: the scaffolded lazy-store pattern,
 * `useStore()` with no `state` context, and an explicit context provider that
 * wins over the bond.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import { setupAllDefaultBonds } from '@molecule/app-bonds-default-svelte'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { StateProvider, Store } from '@molecule/app-state'
import {
  createSimpleStateProvider,
  createStore,
  hasProvider,
  setProvider,
  simpleProvider,
} from '@molecule/app-state'

import { setMoleculeContext, useStateProvider } from '../context.js'
import { useStore } from '../hooks/index.js'

const hosts: Array<() => Promise<void>> = []

/**
 * Mounts the conformance host with a hook run during child init, under the
 * case's services.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the tree's unmount.
 */
function mountHook<T>(
  config: Parameters<typeof setMoleculeContext>[0],
  run: () => T,
): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config,
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, stop }
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/** Settles the queued microtask render the snapshot engine schedules. */
async function settle(): Promise<void> {
  await Promise.resolve()
  flushSync()
}

const suite = 'the Svelte composition root supplies the bonded state provider by default'

// In file order even under `--sequence.shuffle`: the first test asserts that nothing has
// bonded the state provider yet, which holds only before the later tests bond one.
describe(suite, { shuffle: false }, () => {
  it('makes the documented lazy-store pattern work in the scaffolded shape', async () => {
    // Nothing bonds the state provider until a setup runs: `createStore()` at
    // module scope throws before the scaffold's bonds are wired.
    expect(hasProvider()).toBe(false)
    setupAllDefaultBonds()

    const initialState = { sidebarOpen: false }
    let uiStore: Store<typeof initialState> | undefined
    const getUiStore = (): Store<typeof initialState> => (uiStore ??= createStore({ initialState }))

    const { result } = mountHook({}, () => useStore(getUiStore()))
    expect(get(result)).toEqual({ sidebarOpen: false })
    getUiStore().setState({ sidebarOpen: true })
    await settle()
    expect(get(result).sidebarOpen).toBe(true)
  })

  it('lets useStore() work with no `state` prop', async () => {
    setProvider(simpleProvider)
    const store = createStore({ initialState: { sidebarOpen: false } })

    // No `setMoleculeContext` at all: `useStore(store)` takes its store as an
    // argument, so it needs no state context.
    const { result } = mountHook({}, () => useStore(store))
    expect(get(result)).toEqual({ sidebarOpen: false })
  })

  it('still lets an explicit `state` prop override the bond', () => {
    setProvider(simpleProvider)
    const explicitProvider: StateProvider = createSimpleStateProvider()
    const { result } = mountHook({ state: explicitProvider }, () => useStateProvider())

    expect(result).toBe(explicitProvider)
    expect(result).not.toBe(simpleProvider)
  })
})
