// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, type Ref } from 'vue'

import { setupAllDefaultBonds } from '@molecule/app-bonds-default-vue'
import type { StateProvider, Store } from '@molecule/app-state'
import {
  createSimpleStateProvider,
  createStore,
  getProvider,
  hasProvider,
  setProvider,
  simpleProvider,
} from '@molecule/app-state'

import { useStateProvider, useStore } from '../composables/useStore.js'
import { moleculePlugin } from '../plugin.js'

/** The provider a scaffolded app ends up with (see the first test). */
const scaffoldedProvider = (): typeof simpleProvider => {
  setProvider(simpleProvider)
  return simpleProvider
}

describe('moleculePlugin supplies the bonded state provider by default (flash-m65)', () => {
  // FIRST: nothing bonds the state provider until a setup runs, so this test
  // can assert the pre-state the scaffold used to be stuck in.
  //
  // NOTE: this imports `@molecule/app-bonds-default-vue` — i.e. its BUILT
  // `dist/`, as a scaffold consumes it — so rebuild that package after editing
  // its source (`cd packages/app/infrastructure/bonds-default-vue && npx
  // tsc`), or this test runs against the previous build.
  it('makes the documented lazy-store pattern work in the scaffolded shape', async () => {
    // Exactly what a scaffolded app does: `setupProviders()` wires the default
    // bonds, `app.use(moleculePlugin, …)` installs with no `state` option, and
    // the page creates its store lazily (creating one at module scope throws
    // before the providers are set, so the docs must not show it).
    expect(hasProvider()).toBe(false)
    setupAllDefaultBonds()

    const initialState = { sidebarOpen: false }
    let uiStore: Store<typeof initialState> | undefined
    const getUiStore = (): Store<typeof initialState> => (uiStore ??= createStore({ initialState }))

    let state!: Ref<{ sidebarOpen: boolean }>
    let provider!: StateProvider
    const Page = defineComponent({
      setup() {
        state = useStore(getUiStore())
        provider = useStateProvider()
        return () => h('div')
      },
    })
    mount(Page, { global: { plugins: [[moleculePlugin, {}]] } })

    // The plugin supplied the provider every `createStore()` reads, with no
    // `state` option — React's `MoleculeProvider` fallback.
    expect(provider).toBe(getProvider())
    expect(state.value).toEqual({ sidebarOpen: false })
    getUiStore().setState({ sidebarOpen: true })
    await nextTick()
    expect(state.value.sidebarOpen).toBe(true)
  })

  it('lets useStore() work with no `state` prop', () => {
    scaffoldedProvider()
    const store = createStore({ initialState: { sidebarOpen: false } })

    let state!: Ref<{ sidebarOpen: boolean }>
    const Page = defineComponent({
      setup() {
        state = useStore(store)
        return () => h('div')
      },
    })
    mount(Page, { global: { plugins: [[moleculePlugin, {}]] } })

    expect(state.value).toEqual({ sidebarOpen: false })
  })

  it('still lets an explicit `state` prop override the bond', () => {
    scaffoldedProvider()
    const explicitProvider = createSimpleStateProvider()

    let provider!: StateProvider
    const Page = defineComponent({
      setup() {
        provider = useStateProvider()
        return () => h('div')
      },
    })
    mount(Page, { global: { plugins: [[moleculePlugin, { state: explicitProvider }]] } })

    expect(provider).toBe(explicitProvider)
    expect(provider).not.toBe(simpleProvider)
  })
})
