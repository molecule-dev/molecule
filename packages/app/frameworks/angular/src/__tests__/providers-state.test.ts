// @vitest-environment jsdom

/**
 * `provideMolecule` supplies the bonded state provider by default, the way
 * React's `MoleculeProvider` does without a `state` prop.
 *
 * The first test asserts the pre-state a scaffold is stuck in until its setup
 * runs; the other two pin the provider the scaffold ends up with.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { StateProvider, Store } from '@molecule/app-state'
import {
  createSimpleStateProvider,
  createStore,
  hasProvider,
  setProvider,
  simpleProvider,
} from '@molecule/app-state'

import { useStateProvider, useStore } from '../hooks/index.js'
import { provideMolecule } from '../providers.js'

/** The provider a scaffolded app ends up with (see the first test). */
const scaffoldedProvider = (): typeof simpleProvider => {
  setProvider(simpleProvider)
  return simpleProvider
}

/**
 * Mounts one probe component under `provideMolecule` and renders it once.
 *
 * @param component - The probe component class.
 * @param state - The state provider the bootstrapped app passes, if any.
 * @returns The mounted fixture.
 */
function mount<P>(component: Type<P>, state?: StateProvider): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideMolecule({ state })],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('provideMolecule supplies the bonded state provider by default (flash-m65)', () => {
  // FIRST: nothing bonds the state provider until a setup runs, so this test
  // can assert the pre-state the scaffold used to be stuck in.
  it('makes the documented lazy-store pattern work in the scaffolded shape', () => {
    // Exactly what a scaffolded app does: `setupProviders()` wires the default
    // bonds (the first of them being this vanilla `simpleProvider`), the
    // bootstrapped app calls `provideMolecule(...)` with no `state` option, and
    // the page creates its store lazily (creating one at module scope throws
    // before the providers are set, so the docs must not show it).
    expect(hasProvider()).toBe(false)
    scaffoldedProvider()

    const initialState = { sidebarOpen: false }
    let uiStore: Store<typeof initialState> | undefined
    const getUiStore = (): Store<typeof initialState> => (uiStore ??= createStore({ initialState }))

    /** Reads the lazily created store the scaffold's page subscribes to. */
    @Component({ selector: 'app-test-lazy-store-probe', template: '<p>{{ open() }}</p>' })
    class LazyStoreProbeComponent {
      readonly sidebar = useStore(getUiStore())

      /**
       * The rendered value of the sidebar flag.
       *
       * @returns The flag as a string.
       */
      open(): string {
        return String(this.sidebar().sidebarOpen)
      }
    }

    const fixture = mount(LazyStoreProbeComponent)

    expect(fixture.componentInstance.sidebar()).toEqual({ sidebarOpen: false })
    getUiStore().setState({ sidebarOpen: true })
    fixture.detectChanges()
    expect(fixture.componentInstance.sidebar().sidebarOpen).toBe(true)
    expect(fixture.nativeElement.textContent).toBe('true')
  })

  it('lets useStore() work with no `state` prop', () => {
    scaffoldedProvider()
    const store = createStore({ initialState: { sidebarOpen: false } })

    /** Reads a store handed to it, with no `state` option registered. */
    @Component({ selector: 'app-test-store-default-probe', template: '' })
    class StoreDefaultProbeComponent {
      readonly state = useStore(store)
    }

    const fixture = mount(StoreDefaultProbeComponent)

    expect(fixture.componentInstance.state()).toEqual({ sidebarOpen: false })
  })

  it('still lets an explicit `state` prop override the bond', () => {
    scaffoldedProvider()
    const explicitProvider = createSimpleStateProvider()

    /** Reads the state registration an explicit `state` option supplies. */
    @Component({ selector: 'app-test-state-override-probe', template: '' })
    class StateOverrideProbeComponent {
      readonly provider = useStateProvider()
    }

    const fixture = mount(StateOverrideProbeComponent, explicitProvider)

    expect(fixture.componentInstance.provider).toBe(explicitProvider)
    expect(fixture.componentInstance.provider).not.toBe(simpleProvider)
  })
})
