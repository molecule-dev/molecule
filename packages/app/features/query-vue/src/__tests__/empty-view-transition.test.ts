// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { h } from 'vue'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import { useQuery } from '../useQuery.js'
import { deferred, mountApp, settle, unmountAll } from './helpers.js'

type Page = { rows: string[] }

beforeAll(() => setProvider(provider))
beforeEach(() => {
  resetQueryClient()
})
afterEach(async () => {
  await unmountAll()
})

it('waits for the initial collection before offering an empty-state action', async () => {
  const request = deferred<Page>()
  const view = mountApp(() => {
    const query = useQuery<Page>({ key: ['inventory'], fetch: async () => request.promise })
    return () =>
      h(QueryContent<Page>, {
        query: query.value,
        pending: 'Loading',
        empty: {
          when: (page) => page.rows.length === 0,
          render: () => h('a', { href: '/inventory/new' }, 'Add item'),
        },
        children: (page) => h('p', {}, page.rows.join(', ')),
      })
  })
  expect(view.host.textContent).toBe('Loading')
  expect(view.host.querySelector('a')).toBeNull()
  request.resolve({ rows: ['Bolt'] })
  await settle()
  expect(view.host.textContent).toBe('Bolt')
  expect(view.host.querySelector('a')).toBeNull()
})
