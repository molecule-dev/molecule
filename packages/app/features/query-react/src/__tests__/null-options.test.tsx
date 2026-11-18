/**
 * `null` options observe nothing, and forget the last key's state: observing that
 * key again starts from what the cache holds now, over both query bonds.
 */
import { act, createElement, useEffect, useState } from 'react'
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
})

/** Lets promise callbacks and cache notifications land. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await act(async () => {})
}

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
    const probe: { enable?: (on: boolean) => void } = {}

    function Doc(): null {
      const [enabled, setEnabled] = useState(true)
      useEffect(() => {
        probe.enable = setEnabled
      }, [])
      const query = useQuery(enabled ? { key: ['doc'], fetch: async () => 'one' } : null)
      seen(query.data)
      return null
    }

    root = createRoot(document.createElement('div'))
    act(() => root!.render(createElement(Doc)))
    await settle()
    expect(seen).toHaveBeenLastCalledWith('one')

    act(() => probe.enable?.(false))
    await settle()
    expect(seen).toHaveBeenLastCalledWith(undefined)

    // The document changes while nothing observes it.
    getQueryClient().set(['doc'], 'two')
    seen.mockClear()
    act(() => probe.enable?.(true))

    expect(seen.mock.calls[0]?.[0]).toBe('two')
  })
})
