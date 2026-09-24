/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the built-in `simpleProvider` store,
 * read through the real `@molecule/app-react` `useStore` hook, rendered with
 * `react-dom/server`.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StateProvider, useStore } from '@molecule/app-react'

import { createStore, setProvider, simpleProvider } from '../index.js'

interface UiState {
  sidebarOpen: boolean
  unread: number
}

describe('README @example', () => {
  it('renders the selected slice and applies shallow-merged updates', () => {
    setProvider(simpleProvider)

    const uiStore = createStore<UiState>({
      name: 'ui',
      initialState: { sidebarOpen: false, unread: 3 },
    })

    /**
     * Badge reading the `unread` slice.
     *
     * @returns The badge element.
     */
    function UnreadBadge(): React.JSX.Element {
      const unread = useStore(uiStore, { selector: (state) => state.unread })
      return <span data-mol-id="unread-badge">{unread}</span>
    }

    /**
     * App root wrapping the badge in the state context.
     *
     * @returns The app element.
     */
    function App(): React.JSX.Element {
      return (
        <StateProvider provider={simpleProvider}>
          <UnreadBadge />
        </StateProvider>
      )
    }

    expect(renderToStaticMarkup(<App />)).toBe('<span data-mol-id="unread-badge">3</span>')

    const seen: number[] = []
    const unsubscribe = uiStore.subscribe((state) => seen.push(state.unread))
    uiStore.setState((state) => ({ unread: state.unread + 1 }))
    unsubscribe()

    expect(uiStore.getState()).toEqual({ sidebarOpen: false, unread: 4 })
    expect(seen).toEqual([4])
    expect(renderToStaticMarkup(<App />)).toBe('<span data-mol-id="unread-badge">4</span>')
  })

  it('throws when useStore runs outside a StateProvider', () => {
    setProvider(simpleProvider)
    const store = createStore<UiState>({ initialState: { sidebarOpen: false, unread: 0 } })

    /**
     * Reads the store with no `StateProvider` above it.
     *
     * @returns Never — `useStore` throws.
     */
    function Bare(): React.JSX.Element {
      const unread = useStore(store, { selector: (state) => state.unread })
      return <span>{unread}</span>
    }

    expect(() => renderToStaticMarkup(<Bare />)).toThrow()
  })
})
