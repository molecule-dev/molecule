// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/null-options.test.tsx`: `null` options
 * observe nothing, and forget the last key's state — observing that key again
 * starts from what the cache holds now, over both query bonds.
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
] as const)('useQuery with null options over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('observing a key again starts from the cache, not from its earlier state', async () => {
    const seen = vi.fn<(data: string | undefined) => void>()
    const [enabled, setEnabled] = createSignal(true)

    mountComponent(() => {
      const query = useQuery(() => (enabled() ? { key: ['doc'], fetch: async () => 'one' } : null))
      // The page's own render: reading the document through the hook is what
      // re-renders it, so every value it shows reaches `seen`.
      return <output>{String(seen(query.data))}</output>
    })
    await settle()
    expect(seen).toHaveBeenLastCalledWith('one')

    setEnabled(false)
    await settle()
    expect(seen).toHaveBeenLastCalledWith(undefined)

    // The document changes while nothing observes it.
    getQueryClient().set(['doc'], 'two')
    seen.mockClear()
    setEnabled(true)
    await settle()

    expect(seen.mock.calls[0]?.[0]).toBe('two')
  })
})
