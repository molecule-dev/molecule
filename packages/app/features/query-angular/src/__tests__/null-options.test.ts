// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/null-options.test.tsx`: `null` options
 * observe nothing, and forget the last key's state — observing that key again
 * starts from what the cache holds now, over both query bonds.
 */
import '@angular/compiler'
import { computed, effect, signal } from '@angular/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
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
] as const)('useQuery with null options over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('observing a key again starts from the cache, not from its earlier state', async () => {
    const seen: (string | undefined)[] = []
    const enabled = signal(true)
    const source = computed<QueryOptions<string> | null>(() =>
      enabled() ? { key: ['doc'], fetch: async () => 'one' } : null,
    )
    const h = await mountTracked(() => {
      const query = useQuery<string>(source)
      // The page's own template read: every value it shows reaches `seen`.
      effect(() => {
        seen.push(query.data)
      })
      return query
    })
    await h.settle()
    expect(seen.at(-1)).toBe('one')

    enabled.set(false)
    await h.settle()
    expect(seen.at(-1)).toBeUndefined()

    // The document changes while nothing observes it.
    getQueryClient().set(['doc'], 'two')
    seen.length = 0
    enabled.set(true)
    await h.settle()

    expect(seen[0]).toBe('two')
  })
})
