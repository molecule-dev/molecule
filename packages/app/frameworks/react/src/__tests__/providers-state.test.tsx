// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'
import type { Store } from '@molecule/app-state'
import {
  createSimpleStateProvider,
  createStore,
  hasProvider,
  setProvider,
  simpleProvider,
} from '@molecule/app-state'

import { useStateProvider, useStore } from '../hooks/index.js'
import { MoleculeProvider } from '../providers.js'

/** The provider a scaffolded app ends up with (see the first test). */
const scaffoldedProvider = (): typeof simpleProvider => {
  setProvider(simpleProvider)
  return simpleProvider
}

describe('MoleculeProvider supplies the bonded state provider by default (flash-m65)', () => {
  // FIRST: nothing bonds the state provider until a setup runs, so this test
  // can assert the pre-state the scaffold used to be stuck in.
  //
  // NOTE: this imports `@molecule/app-bonds-default-react` — i.e. its BUILT
  // `dist/`, as a scaffold consumes it — so rebuild that package after editing
  // its source (`cd packages/app/infrastructure/bonds-default-react && npx
  // tsc`), or this test runs against the previous build.
  it('makes the documented lazy-store pattern work in the scaffolded shape', () => {
    // Exactly what a scaffolded app does: `setupProviders()` wires the default
    // bonds, `<App>` wraps its tree in `<MoleculeProvider>` with no `state`
    // prop, and the page creates its store lazily (creating one at module
    // scope throws before the providers are set, so the docs must not show it).
    expect(hasProvider()).toBe(false)
    setupAllDefaultBonds()

    const initialState = { sidebarOpen: false }
    let uiStore: Store<typeof initialState> | undefined
    const getUiStore = (): Store<typeof initialState> => (uiStore ??= createStore({ initialState }))

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MoleculeProvider>{children}</MoleculeProvider>
    )
    const { result } = renderHook(() => useStore(getUiStore()), { wrapper })

    expect(result.current).toEqual({ sidebarOpen: false })
    act(() => getUiStore().setState({ sidebarOpen: true }))
    expect(result.current.sidebarOpen).toBe(true)
  })

  it('lets useStore() work with no `state` prop', () => {
    scaffoldedProvider()
    const store = createStore({ initialState: { sidebarOpen: false } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MoleculeProvider>{children}</MoleculeProvider>
    )

    const { result } = renderHook(() => useStore(store), { wrapper })

    expect(result.current).toEqual({ sidebarOpen: false })
  })

  it('still lets an explicit `state` prop override the bond', () => {
    scaffoldedProvider()
    const explicitProvider = createSimpleStateProvider()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MoleculeProvider state={explicitProvider}>{children}</MoleculeProvider>
    )

    const { result } = renderHook(() => useStateProvider(), { wrapper })

    expect(result.current).toBe(explicitProvider)
    expect(result.current).not.toBe(simpleProvider)
  })
})
