/**
 * The titles of React's `provider-lifecycle.test.tsx`, over this bond's real Solid
 * Router: "under StrictMode" keeps React's words (Solid has no StrictMode) and the body
 * mounts, navigates and updates a signal instead, asserting one `onRouterReady` call.
 */
import type { Navigator } from '@solidjs/router'
import { MemoryRouter, Route, useNavigate } from '@solidjs/router'
import { createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Router } from '@molecule/app-routing'
import { getRouter } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../index.js'
import { createSolidMemoryHistory } from '../memory-history.js'

// Flush macrotasks so a navigation in flight commits
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Waits until a navigation in flight has committed.
 *
 * @returns A promise that settles after the router has committed.
 */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await flush()
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('MoleculeRouterProvider lifecycle', () => {
  it('shows a page mounted by a navigation the new location in its first render', async () => {
    const firstRenderPaths: string[] = []
    let go: Navigator | undefined
    const history = createSolidMemoryHistory(['/'])
    const container = document.createElement('div')

    // Reads the location the way `@molecule/app-solid`'s `useRouter` does: while the page
    // component renders for the first time.
    function Page(): JSX.Element {
      firstRenderPaths.push(getRouter().getLocation().pathname)
      return <div />
    }
    function Home(): JSX.Element {
      go = useNavigate()
      return <div />
    }

    const dispose = render(
      () => (
        <MemoryRouter
          history={history}
          root={(props) => (
            <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
          )}
        >
          <Route path="/" component={Home} />
          <Route path="/page" component={Page} />
        </MemoryRouter>
      ),
      container,
    )

    await go?.('/page')
    await settle()

    expect(firstRenderPaths[0]).toBe('/page')

    dispose()
  })

  it('calls onRouterReady once with the bonded router under StrictMode', async () => {
    // Solid has no StrictMode: the title keeps React's words and the body mounts,
    // navigates and updates a signal (a re-render), asserting one call.
    const onRouterReady = vi.fn<(router: Router) => void>()
    const [tick, setTick] = createSignal(0)
    const history = createSolidMemoryHistory(['/'])
    const container = document.createElement('div')
    let go: Navigator | undefined

    function App(): JSX.Element {
      go = useNavigate()
      return (
        <Show when={tick() > 0}>
          <p>app</p>
        </Show>
      )
    }

    const dispose = render(
      () => (
        <MemoryRouter
          history={history}
          root={(props) => (
            <MoleculeRouterProvider history={history} onRouterReady={onRouterReady}>
              {props.children}
            </MoleculeRouterProvider>
          )}
        >
          <Route path="*" component={App} />
        </MemoryRouter>
      ),
      container,
    )

    await go?.('/elsewhere')
    await settle()
    setTick(1)
    await settle()

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())

    dispose()
  })

  it('does not call onRouterReady again when only the callback changes', async () => {
    const first = vi.fn<(router: Router) => void>()
    const second = vi.fn<(router: Router) => void>()
    const [callback, setCallback] = createSignal(first)
    const history = createSolidMemoryHistory(['/'])
    const container = document.createElement('div')

    const dispose = render(
      () => (
        <MemoryRouter
          history={history}
          root={(props) => (
            <MoleculeRouterProvider history={history} onRouterReady={callback()}>
              {props.children}
            </MoleculeRouterProvider>
          )}
        />
      ),
      container,
    )

    expect(first).toHaveBeenCalledTimes(1)
    setCallback(() => second)
    await settle()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()

    dispose()
  })
})
