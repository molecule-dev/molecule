import { describe, expect, it } from 'vitest'

import { createStore, getProvider, hasProvider, simpleProvider } from '@molecule/app-state'

import { setupAllDefaultBonds, setupAppStateSimple } from '../setup.js'

describe('default app bonds wire the state provider (flash-m65)', () => {
  it('setupAllDefaultBonds() bonds a state provider, so createStore() works in a scaffolded app', () => {
    // The failure this guards: nothing in a scaffold wired the `state` bond, so
    // the documented createStore() pattern threw "No provider set" at the first
    // render and every page came up blank while tsc passed.
    expect(hasProvider()).toBe(false)
    expect(() => createStore({ initialState: { sidebarOpen: false } })).toThrow(/No provider set/)

    setupAllDefaultBonds()

    expect(hasProvider()).toBe(true)
    const store = createStore({ initialState: { sidebarOpen: false } })
    expect(store.getState()).toEqual({ sidebarOpen: false })
    store.setState({ sidebarOpen: true })
    expect(store.getState().sidebarOpen).toBe(true)
  })

  it('setupAppStateSimple() is that same wiring on its own', () => {
    setupAppStateSimple()

    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(simpleProvider)
  })
})
