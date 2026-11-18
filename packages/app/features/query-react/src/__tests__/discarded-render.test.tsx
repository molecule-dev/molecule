/**
 * A render React throws away (a transition that suspends, then an urgent update)
 * must not change the options the key on screen observes: no resubscription, no
 * refetch, over both query bonds.
 */
import {
  act,
  createElement,
  type ReactElement,
  startTransition,
  Suspense,
  use,
  useEffect,
  useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  vi.restoreAllMocks()
})

/** Lets promise callbacks and cache notifications land. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await act(async () => {})
}

/** A promise that never settles: a child that reads it suspends for good. */
const never = new Promise<never>(() => {})

/** Suspends while `k` is 'B', so a transition to 'B' renders and is never committed. */
function Blocker({ k }: { k: string }): null {
  if (k === 'B') use(never)
  return null
}

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('useQuery and a discarded render over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('neither resubscribes nor refetches the key on screen', async () => {
    const subscribe = vi.spyOn(getQueryClient(), 'subscribe')
    const fetch = vi.fn(async (k: string) => ({ k }))
    const rendered = vi.fn<(k: string) => void>()
    const probe: { goTo?: (k: string) => void; bump?: () => void } = {}

    function Doc({ k, onRender }: { k: string; onRender: (k: string) => void }): null {
      onRender(k)
      // A fresh options object and fetch closure on every render, as a page writes them.
      useQuery({ key: ['doc', k], fetch: () => fetch(k) })
      return null
    }
    function App(): ReactElement {
      const [k, setK] = useState('A')
      const [, setTick] = useState(0)
      useEffect(() => {
        probe.goTo = (next) => startTransition(() => setK(next))
        probe.bump = () => setTick((n) => n + 1)
      }, [])
      return createElement(
        Suspense,
        { fallback: null },
        createElement(Doc, { k, onRender: rendered }),
        createElement(Blocker, { k }),
      )
    }

    root = createRoot(document.createElement('div'))
    act(() => root!.render(createElement(App)))
    await settle()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => probe.goTo?.('B'))
    expect(rendered).toHaveBeenCalledWith('B')
    // An urgent update re-renders key A while the transition to B stays suspended.
    const before = rendered.mock.calls.length
    await act(async () => probe.bump?.())
    await settle()

    expect(rendered.mock.calls.slice(before).map(([k]) => k)).toContain('A')
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
