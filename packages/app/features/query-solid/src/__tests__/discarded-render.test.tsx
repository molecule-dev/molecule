// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/discarded-render.test.tsx`. Solid has no
 * render React can throw away, so the discarded render is not reproduced; what
 * a person sees under it is: a re-render that rebuilds the options object and
 * the fetch closure for the key on screen neither resubscribes nor refetches
 * it, over both query bonds.
 */
import { createSignal } from 'solid-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../use-query.js'
import { mountComponent, settle, unmountAll } from './helpers.jsx'

afterEach(unmountAll)

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
    const fetch = vi.fn(async () => 'A')
    const rendered = vi.fn<(data: string | undefined) => void>()
    const [tick, setTick] = createSignal(0)

    const view = mountComponent(() => {
      // A fresh options object and fetch closure on every update, as a page writes them.
      const query = useQuery(() => {
        tick()
        return { key: ['doc'], fetch: () => fetch() }
      })
      const shown = (): string | undefined => {
        tick()
        rendered(query.data)
        return query.data
      }
      return <output>{String(shown())}</output>
    })
    await settle()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(rendered).toHaveBeenCalledWith('A')

    // An update re-renders the page itself while the render that was thrown
    // away never reached the observer; the key on screen is the same one.
    const before = rendered.mock.calls.length
    setTick(1)
    await settle()

    expect(rendered.mock.calls.slice(before).map(([data]) => data)).toContain('A')
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(view.host.textContent).toBe('A')
  })
})
