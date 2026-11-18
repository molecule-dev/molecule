// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/discarded-render.test.tsx`. Svelte commits
 * every update, so there is no render to throw away; what a person sees under
 * one is: an update that rebuilds the options object and the fetch closure for
 * the key on screen neither resubscribes nor refetches it, over both query
 * bonds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { type MountedQuery, renderHook, settle } from './helpers/harness.js'

const mounted: MountedQuery<unknown>[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
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
    const page = renderHook<string>({ key: ['doc'], fetch: () => fetch() })
    mounted.push(page as MountedQuery<unknown>)
    await settle()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(page.value().data).toBe('A')

    // A re-render with a fresh options object and fetch closure, as a page
    // writes them; the render that was thrown away never reached the observer.
    page.setOptions({ key: ['doc'], fetch: () => fetch() })
    await settle()

    expect(page.value().data).toBe('A')
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
