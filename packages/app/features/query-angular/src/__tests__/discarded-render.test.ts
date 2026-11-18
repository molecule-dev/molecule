// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/discarded-render.test.tsx`. Angular has no
 * render React can throw away, so the discarded render is not reproduced; what
 * a person sees under it is: an update that rebuilds the options object and the
 * fetch closure for the key on screen neither resubscribes nor refetches it,
 * over both query bonds.
 */
import '@angular/compiler'
import { computed, effect, signal } from '@angular/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../index.js'
import { destroyQueryMounts, mountTracked } from './query-harness.js'

afterEach(async () => {
  await destroyQueryMounts()
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
    const rendered: (string | undefined)[] = []
    const tick = signal(0)
    // A fresh options object and fetch closure on every update, as a page writes them.
    const source = computed(() => {
      tick()
      return { key: ['doc'], fetch: () => fetch() }
    })
    const h = await mountTracked(() => {
      const query = useQuery<string>(source)
      // The page's own template read: it records the key on screen on every update.
      effect(() => {
        tick()
        rendered.push(query.data)
      })
      return query
    })
    await h.settle()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(rendered.at(-1)).toBe('A')

    // An update re-renders the page itself while the render that was thrown
    // away never reached the observer; the key on screen is the same one.
    const before = rendered.length
    tick.set(1)
    await h.settle()

    expect(rendered.slice(before)).toContain('A')
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(h.result().data).toBe('A')
  })
})
