// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import { afterEach, beforeEach, expect, it } from 'vitest'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.jsx'
import { useQuery } from '../use-query.js'
import { deferred, mountComponent, settle, unmountAll } from './helpers.jsx'

type Page = { rows: string[] }

beforeEach(() => {
  resetQueryClient()
  setProvider(provider)
})
afterEach(unmountAll)

it('waits for the initial collection before offering an empty-state action', async () => {
  const request = deferred<Page>()
  const view = mountComponent(() => {
    const query = useQuery<Page>({ key: ['inventory'], fetch: async () => request.promise })
    return (
      <QueryContent<Page>
        query={query}
        pending="Loading"
        empty={{
          when: (page) => page.rows.length === 0,
          render: () => <a href="/inventory/new">Add item</a>,
        }}
        children={(page) => <p>{page().rows.join(', ')}</p>}
      />
    )
  })
  expect(view.host.textContent).toBe('Loading')
  expect(view.host.querySelector('a')).toBeNull()
  request.resolve({ rows: ['Bolt'] })
  await settle()
  expect(view.host.textContent).toBe('Bolt')
  expect(view.host.querySelector('a')).toBeNull()
})
