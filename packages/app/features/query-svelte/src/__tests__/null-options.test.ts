// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/null-options.test.tsx`: `null` options
 * observe nothing, and forget the last key's state — observing that key again
 * starts from what the cache holds now, over both query bonds.
 */
import { flushSync, mount, unmount } from 'svelte'
import { type Writable, writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import type { UseQueryResult } from '../types.js'
import { settle } from './helpers/harness.js'
import Probe from './helpers/Probe.svelte'

const containers: HTMLDivElement[] = []
const unmounters: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const unmounter of unmounters.splice(0)) await unmounter()
  for (const container of containers.splice(0)) container.remove()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('useQuery with null options over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('observing a key again starts from the cache, not from its earlier state', async () => {
    const seen: (string | undefined)[] = []
    const options: Writable<QueryOptions<string> | null> = writable({
      key: ['doc'],
      fetch: async () => 'one',
    })
    const container = document.createElement('div')
    document.body.append(container)
    containers.push(container)
    const instance = mount<
      {
        options: Writable<QueryOptions<string> | null>
        capture: (value: UseQueryResult<string>) => void
      },
      Record<string, never>
    >(Probe, {
      target: container,
      props: {
        options,
        capture: (value: UseQueryResult<string>) => seen.push(value.data),
      },
    })
    flushSync()
    unmounters.push(() => unmount(instance))
    await settle()
    expect(seen.at(-1)).toBe('one')

    options.set(null)
    flushSync()
    await settle()
    expect(seen.at(-1)).toBeUndefined()

    // The document changes while nothing observes it.
    getQueryClient().set(['doc'], 'two')
    seen.length = 0
    options.set({ key: ['doc'], fetch: async () => 'one' })
    flushSync()

    expect(seen[0]).toBe('two')
  })
})
