// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/null-options.test.tsx`: `null` options
 * observe nothing, and forget the last key's state — observing that key again
 * starts from what the cache holds now, over both query bonds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'

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
] as const)('useQuery with null options over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('observing a key again starts from the cache, not from its earlier state', async () => {
    const seen = vi.fn<(data: string | undefined) => void>()
    const enabled = shallowRef(true)

    mountApp(() => {
      const query = useQuery(() =>
        enabled.value ? { key: ['doc'], fetch: async () => 'one' } : null,
      )
      return () => {
        seen(query.value.data)
        return null
      }
    })
    await settle()
    expect(seen).toHaveBeenLastCalledWith('one')

    enabled.value = false
    await settle()
    expect(seen).toHaveBeenLastCalledWith(undefined)

    // The document changes while nothing observes it.
    getQueryClient().set(['doc'], 'two')
    seen.mockClear()
    enabled.value = true
    await nextTick()

    expect(seen.mock.calls[0]?.[0]).toBe('two')
  })
})
