// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/discarded-render.test.tsx`. Vue has no
 * render React can throw away, so the discarded render is not reproduced;
 * what a person sees under it is: a parent re-render that rebuilds the options
 * object and the fetch closure for the key on screen neither resubscribes nor
 * refetches it, over both query bonds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, shallowRef } from 'vue'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'
import { mountApp, settle, unmountAll } from './helpers.js'

afterEach(async () => {
  await unmountAll()
})

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
    const tick = shallowRef(0)

    const view = mountApp(() => {
      // A fresh options object and fetch closure on every render, as a page writes them.
      const query = useQuery(() => {
        void tick.value
        return { key: ['doc'], fetch: () => fetch() }
      })
      return () => {
        void tick.value
        rendered(query.value.data)
        return h('output', {}, String(query.value.data))
      }
    })
    await settle()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(rendered).toHaveBeenCalledWith('A')

    // An urgent update re-renders the page itself (the `tick` read), while the
    // render that was thrown away never reached the observer; the key on screen
    // is the same one.
    const before = rendered.mock.calls.length
    tick.value += 1
    await settle()

    expect(rendered.mock.calls.slice(before).map(([data]) => data)).toContain('A')
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(view.host.textContent).toBe('A')
  })
})
