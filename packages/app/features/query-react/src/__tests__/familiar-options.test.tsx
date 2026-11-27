/**
 * Code written the way TanStack Query reads compiles and works: `staleTime` sets freshness, and
 * `{query.error && …}` renders `query.error.message`. This is the shape an agent wrote in a harness
 * smoke run (2026-11-27): `staleTime` was not an option then, so the whole options object stopped
 * inferring its document type, and an `unknown` error could not appear in JSX: 25 type errors from
 * one option name. This file failing to typecheck is the regression.
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { QueryProvider } from '@molecule/app-query'
import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { useQuery } from '../useQuery.js'

interface Tool {
  id: string
  name: string
}
interface RequestLists {
  sent: Tool[]
}

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
})

/** Lets promise callbacks and cache notifications land. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await act(async () => {})
}

/** The agent's hook: options or `null`, TanStack's `staleTime`, an untyped `signal`. */
function useRequests(memberId: string | undefined, fetchLists: () => Promise<RequestLists>) {
  return useQuery(
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
}

function Requests(props: { fetchLists: () => Promise<RequestLists> }): ReactNode {
  const requests = useRequests('member-1', props.fetchLists)
  const names = requests.data?.sent.map((tool) => tool.name).join(', ')
  return createElement(
    'div',
    null,
    requests.error && createElement('p', { role: 'alert' }, requests.error.message),
    names ? createElement('p', null, names) : null,
  )
}

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('TanStack-style options over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('infers the document type and renders it', async () => {
    const container = document.createElement('div')
    root = createRoot(container)
    act(() => {
      root!.render(
        createElement(Requests, {
          fetchLists: async () => ({ sent: [{ id: 't1', name: 'Drill' }] }),
        }),
      )
    })
    await settle()
    expect(container.textContent).toBe('Drill')
  })

  it('renders error.message from a rejection, even one that is not an Error', async () => {
    const container = document.createElement('div')
    root = createRoot(container)
    act(() => {
      root!.render(
        createElement(Requests, {
          fetchLists: () => Promise.reject('The tool shed is closed.'),
        }),
      )
    })
    await settle()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('The tool shed is closed.')
  })
})
