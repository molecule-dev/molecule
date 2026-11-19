// @vitest-environment jsdom

/**
 * `MoleculeProvider` supplies the state provider bonded under
 * `@molecule/app-state` by default, so the documented lazy-store pattern works
 * in a scaffolded Solid app exactly as it does in the React one.
 *
 * Mirrors the React package's `providers-state.test.tsx`.
 *
 * @module
 */

import { createComponent, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { setupAppStateSimple } from '@molecule/app-bonds-default'
import type { Store } from '@molecule/app-state'
import {
  createSimpleStateProvider,
  createStore,
  hasProvider,
  setProvider,
  simpleProvider,
} from '@molecule/app-state'

import { useStateProvider, useStore } from '../primitives/state.js'
import { MoleculeProvider } from '../provider.jsx'

interface UiState {
  sidebarOpen: boolean
}

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/** Lets the store subscription's scheduled render run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Reads the labeled `<output>` as JSON.
 *
 * @param container - The rendered tree.
 * @param label - The output's `aria-label`.
 * @returns The parsed value.
 */
function outputOf(container: HTMLElement, label: string): unknown {
  const element = container.querySelector(`output[aria-label="${label}"]`)
  if (!element) throw new Error(`no output matched ${label}`)
  return JSON.parse(element.textContent ?? 'null') as unknown
}

/** The provider a scaffolded app ends up with (see the first test). */
const scaffoldedProvider = (): typeof simpleProvider => {
  setProvider(simpleProvider)
  return simpleProvider
}

/** A page that reads one store through `useStore()`. */
function StateProbe(props: { store: Store<UiState> }): JSX.Element {
  const state = useStore(props.store)
  const provider = useStateProvider()
  return (
    <>
      <output aria-label="state">{JSON.stringify(state())}</output>
      <output aria-label="provider">{String(provider() !== undefined)}</output>
    </>
  )
}

/** A page that reads the state provider from context. */
function ProviderProbe(): JSX.Element {
  const provider = useStateProvider()
  const explicit = (): boolean => provider() !== simpleProvider
  return <output aria-label="provider">{String(explicit())}</output>
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('MoleculeProvider supplies the bonded state provider by default (flash-m65)', () => {
  // FIRST: nothing bonds the state provider until a setup runs, so this test
  // can assert the pre-state the scaffold used to be stuck in.
  it('makes the documented lazy-store pattern work in the scaffolded shape', async () => {
    // Exactly what a scaffolded app does: `setupProviders()` wires the default
    // bonds (the scaffold's `setupAllDefaultBonds()` calls `setupAppStateSimple`
    // first), `<App>` wraps its tree in `<MoleculeProvider>` with no `state`
    // entry, and the page creates its store lazily (creating one at module
    // scope throws before the providers are set, so the docs must not show it).
    expect(hasProvider()).toBe(false)
    setupAppStateSimple()

    const initialState = { sidebarOpen: false }
    let uiStore: Store<typeof initialState> | undefined
    const getUiStore = (): Store<typeof initialState> => (uiStore ??= createStore({ initialState }))

    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: {},
        get children() {
          return createComponent(StateProbe, {
            get store() {
              return getUiStore()
            },
          })
        },
      }),
    )

    expect(outputOf(container, 'state')).toEqual({ sidebarOpen: false })
    expect(outputOf(container, 'provider')).toBe(true)
    getUiStore().setState({ sidebarOpen: true })
    await settle()
    expect(outputOf(container, 'state')).toEqual({ sidebarOpen: true })
  })

  it('lets useStore() work with no `state` prop', async () => {
    scaffoldedProvider()
    const store = createStore({ initialState: { sidebarOpen: false } })

    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: {},
        get children() {
          return createComponent(StateProbe, { store })
        },
      }),
    )

    expect(outputOf(container, 'state')).toEqual({ sidebarOpen: false })
    expect(outputOf(container, 'provider')).toBe(true)
  })

  it('still lets an explicit `state` prop override the bond', () => {
    scaffoldedProvider()
    const explicitProvider = createSimpleStateProvider()

    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { state: explicitProvider },
        get children() {
          return createComponent(ProviderProbe, {})
        },
      }),
    )

    expect(outputOf(container, 'provider')).toBe(true)
    const rendered = container.querySelector('output[aria-label="provider"]')
    expect(rendered?.textContent).toBe('true')
  })
})
