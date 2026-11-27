// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/familiar-options.test.tsx`: options written the way TanStack
 * Query reads (`staleTime`, an options-or-null value, an untyped `signal`) infer the document
 * type, and a rejection that is not an Error still renders `error.message`. This file failing to
 * typecheck is half of the regression.
 */
import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'
import { type MountedValue, renderBare, settle } from './helpers/harness.js'

interface Tool {
  id: string
  name: string
}
interface RequestLists {
  sent: Tool[]
}

const drill = async (): Promise<RequestLists> => ({ sent: [{ id: 't1', name: 'Drill' }] })
const closed = (): Promise<RequestLists> => Promise.reject('The tool shed is closed.')

/**
 * The agent's hook: TanStack's option names over an options-or-null value.
 *
 * @param fetchLists - Loads the member's requests.
 * @returns The mounted hook's store.
 */
function mountRequests(fetchLists: () => Promise<RequestLists>) {
  const memberId: string | undefined = 'member-1'
  const mounted = renderBare(() =>
    useQuery(
      memberId
        ? {
            key: ['requests', memberId],
            principal: memberId,
            staleTime: 0,
            fetch: async (signal) => {
              signal.throwIfAborted()
              return fetchLists()
            },
          }
        : null,
    ),
  )
  mounts.push(mounted)
  return mounted
}

const mounts: MountedValue<unknown>[] = []
afterEach(async () => {
  for (const mounted of mounts.splice(0)) await mounted.unmount()
})

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('TanStack-style options over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('infers the document type and renders it', async () => {
    const requests = mountRequests(drill)
    await settle()
    expect(get(requests.value()).data?.sent.map((tool) => tool.name)).toEqual(['Drill'])
  })

  it('renders error.message from a rejection, even one that is not an Error', async () => {
    const requests = mountRequests(closed)
    await settle()
    expect(get(requests.value()).error?.message).toBe('The tool shed is closed.')
  })
})
