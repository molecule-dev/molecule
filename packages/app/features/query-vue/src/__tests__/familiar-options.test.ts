// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/familiar-options.test.tsx`: options written the way TanStack
 * Query reads (`staleTime`, an options-or-null value, an untyped `signal`) infer the document
 * type, and a rejection that is not an Error still renders `error.message`. This file failing to
 * typecheck is half of the regression.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h } from 'vue'

import type { QueryProvider } from '@molecule/app-query'
import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'
import { mountApp, settle, unmountAll } from './helpers.js'

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
 * The agent's page: TanStack's option names, rendering the names and the error's message.
 *
 * @param fetchLists - Loads the member's requests.
 * @returns The mounted page's host.
 */
function mountRequests(fetchLists: () => Promise<RequestLists>): HTMLElement {
  const memberId: string | undefined = 'member-1'
  return mountApp(() => {
    const requests = useQuery(() =>
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
    )
    return () => {
      const names = requests.value.data?.sent.map((tool) => tool.name).join(', ')
      return h('div', [
        requests.value.error ? h('p', { role: 'alert' }, requests.value.error.message) : null,
        names ? h('p', names) : null,
      ])
    }
  }).host
}

afterEach(async () => {
  await unmountAll()
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
    const host = mountRequests(drill)
    await settle()
    expect(host.textContent).toBe('Drill')
  })

  it('renders error.message from a rejection, even one that is not an Error', async () => {
    const host = mountRequests(closed)
    await settle()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('The tool shed is closed.')
  })
})
