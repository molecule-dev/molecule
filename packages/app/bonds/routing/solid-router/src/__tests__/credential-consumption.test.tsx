// @vitest-environment jsdom
/**
 * The titles of React's `credential-consumption.test.tsx`, over this bond's real Solid
 * Router: React's `<BrowserRouter>` under `StrictMode` becomes the native browser
 * `<Router>` on a normal mount (Solid has no StrictMode), and the hook is read through a
 * probe component as `renderHook` would read it.
 */
import type { Navigator } from '@solidjs/router'
import { Route, Router, useLocation, useNavigate } from '@solidjs/router'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { useConsumedSearchParam } from '../use-consumed-search-param.js'

/** Flushes macrotasks so a navigation in flight and the cleanup it started settle. */
async function settle(): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/** How the probe reports the hook's tuple, the router's search and its navigate. */
interface Mounted {
  current: {
    /** The tuple, index 0 live. */
    readonly consumed: [string, (value: string) => void]
    /** The native router's current search. */
    readonly search: string
    /** The native router's navigate. */
    readonly navigate: Navigator
  }
  unmount: () => void
}

const mount = (): Mounted => {
  let consumed!: [string, (value: string) => void]
  let location!: ReturnType<typeof useLocation>
  let navigate!: Navigator

  function Probe() {
    consumed = useConsumedSearchParam('token')
    location = useLocation()
    navigate = useNavigate()
    return <div />
  }

  const container = document.createElement('div')
  document.body.append(container)
  const dispose = render(
    () => (
      <Router>
        <Route path="*" component={Probe} />
      </Router>
    ),
    container,
  )
  return {
    current: {
      get consumed() {
        return consumed
      },
      get search() {
        return location.search
      },
      get navigate() {
        return navigate
      },
    },
    unmount: () => {
      dispose()
      container.remove()
    },
  }
}

const begin = (path = '/reset-password?token=first-link-secret&safe=byte%20value#section') => {
  window.history.replaceState({ safe: 'state' }, '', path)
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const probe of mounted.splice(0)) probe.unmount()
  window.history.replaceState(null, '', '/')
})

const open = (): Mounted => {
  const probe = mount()
  mounted.push(probe)
  return probe
}

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', async () => {
    begin()
    const result = open()
    await settle()

    expect(result.current.consumed[0]).toBe('first-link-secret')
    expect(window.location.search).not.toContain('first-link-secret')
    expect(result.current.search).toBe(window.location.search)
    expect(window.location.search).toContain('safe=byte+value')
    expect(window.location.hash).toBe('#section')
    expect(window.history.state.safe).toBe('state')
  })

  it('keeps the consumed credential through query-only navigation', async () => {
    begin()
    const result = open()
    await settle()

    result.current.navigate('?safe=2')
    await settle()

    expect(result.current.consumed[0]).toBe('first-link-secret')
    expect(result.current.search).toBe('?safe=2')
    expect(window.location.search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    begin()
    const result = open()
    await settle()

    result.current.consumed[1]('pasted-token')
    result.current.navigate('?safe=2')
    await settle()
    expect(result.current.consumed[0]).toBe('pasted-token')

    result.current.navigate('/reset-password?token=second-link-secret&safe=2')
    await settle()
    expect(result.current.consumed[0]).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    begin()
    const result = open()
    await settle()

    result.current.navigate('/reset-password?token=second-link-secret&safe=2')
    await settle()

    expect(result.current.consumed[0]).toBe('second-link-secret')
    expect(window.location.search).not.toContain('second-link-secret')
    expect(result.current.search).toBe(window.location.search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', async () => {
    begin('/search?safe=1#results')
    const result = open()
    await settle()

    expect(result.current.consumed[0]).toBe('')
    expect(result.current.search).toBe('?safe=1')
    expect(window.location.search).toBe('?safe=1')
    expect(window.location.hash).toBe('#results')
    expect(window.history.state.safe).toBe('state')
  })
})
