// @vitest-environment jsdom
/**
 * The key and state of a history entry under the Next.js App Router, which writes each
 * entry only when a navigation commits and without the entry's own state
 * (`preserveCustomHistoryState: false` in its navigate and refresh reducers): the state a
 * navigation carries reaches its own entry, and an entry Next rewrites in place keeps it.
 */
import { act, createElement, type ReactNode, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { Router } from '@molecule/app-routing'

import { useMoleculeRouter } from '../hooks.js'
import { createNextClient, type NextClient, useNextClient } from './next-client.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let bridged: Router | undefined
let mounted: { root: Root; client: NextClient; container: HTMLElement } | undefined

/**
 * The app's bridge: one `useMoleculeRouter` over the stand-in's hook values.
 *
 * @returns Nothing; it only bonds.
 */
function Bridge(): ReactNode {
  const { navigation, pathname, searchParams, params } = useNextClient()
  const router = useMoleculeRouter({ navigation, pathname, searchParams, params })
  useEffect(() => {
    bridged = router
  }, [router])
  return null
}

/**
 * Mounts the stand-in Next client at `initialPath` with the bridge inside it.
 *
 * @param initialPath - Where the document starts.
 * @returns The bonded router and the client.
 */
function mount(initialPath: string): { router: Router; client: NextClient } {
  const client = createNextClient({ initialPath })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => {
    root.render(createElement(client.Provider, null, createElement(Bridge)))
  })
  if (!bridged) throw new Error('the bridge did not bond a router')
  mounted = { root, client, container }
  return { router: bridged, client }
}

/** Lets React commit what is pending and the popstate handlers run. */
const settle = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/**
 * Moves the browser history the way the back and forward buttons do, and waits for its
 * `popstate`: jsdom runs the move as a queued task, which one timer turn can run ahead of.
 *
 * @param delta - The history move (`-1` back, `1` forward).
 */
const traverse = async (delta: number): Promise<void> => {
  await act(async () => {
    const popped = new Promise((resolve) => {
      window.addEventListener('popstate', resolve, { once: true })
    })
    window.history.go(delta)
    await popped
  })
  await settle()
}

afterEach(() => {
  if (mounted) {
    const { root, client, container } = mounted
    act(() => {
      root.unmount()
    })
    container.remove()
    client.destroy()
  }
  mounted = undefined
  bridged = undefined
  window.history.replaceState(null, '', '/')
})

describe('history entry key and state under the Next.js App Router', () => {
  it('router.refresh() keeps the key and state of the entry it rewrites', async () => {
    const { router, client } = mount('/start')
    router.navigate('/notes', { state: { draft: 7 } })
    await settle()
    const before = router.getLocation()
    expect(before.state).toEqual({ draft: 7 })

    act(() => {
      client.navigation.refresh()
    })
    await settle()

    expect(router.getLocation().state).toEqual({ draft: 7 })
    expect(router.getLocation().key).toBe(before.key)
  })

  it('an entry Next rewrote in place still has its state after Back and Forward', async () => {
    const { router, client } = mount('/start')
    router.navigate('/notes', { state: 'kept' })
    await settle()
    act(() => {
      client.navigation.refresh()
    })
    await settle()

    await traverse(-1)
    expect(router.getLocation().pathname).toBe('/start')
    await traverse(1)

    expect(router.getLocation().pathname).toBe('/notes')
    expect(router.getLocation().state).toBe('kept')
  })

  it("a <Link> to another URL gets a fresh key and none of the previous entry's state", async () => {
    const { router, client } = mount('/start')
    router.navigate('/notes', { state: { draft: 7 } })
    await settle()
    const notes = router.getLocation()

    act(() => {
      client.link('/other')
    })
    await settle()

    const other = router.getLocation()
    expect(other.pathname).toBe('/other')
    expect(other.state).toBeUndefined()
    expect(other.key).not.toBe(notes.key)
  })

  it('the state of a navigation never lands on the entry it leaves', async () => {
    const { router } = mount('/start')
    router.navigate('/notes', { state: 'for notes' })
    await settle()

    await traverse(-1)

    expect(router.getLocation().pathname).toBe('/start')
    expect(router.getLocation().state).toBeUndefined()
  })
})
