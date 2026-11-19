// @vitest-environment jsdom
import { act, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Route, Routes, useNavigate } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'
import { QueryContent, useQuery } from '@molecule/app-query-react'

import { ListRouteNav } from '../ListRouteNav.js'
import { MemoryRouter } from '../routers.js'
import { useListRoute } from '../useListRoute.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
let go: ReturnType<typeof useNavigate>
const read = vi.fn(async (saved: boolean) => (saved ? ['Bolt'] : ['Bolt', 'Nut']))
const selections = {
  authored: { path: '/members/:member', label: 'Authored' },
  saved: { path: '/members/:member/saved', label: 'Saved' },
}
beforeEach(() => {
  setProvider(provider)
  resetQueryClient()
  read.mockClear()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => act(() => root.unmount()))
function Page() {
  const list = useListRoute({ selections })
  const [panel, setPanel] = useState('Preview')
  const navigate = useNavigate()
  useEffect(() => {
    go = navigate
  })
  const query = useQuery({
    key: ['member-entries', list.selection],
    fetch: () => read(list.selection === 'saved'),
  })
  return (
    <>
      <ListRouteNav selections={selections} aria-label="Member entries" />
      <QueryContent query={query}>
        {(rows) => (
          <ul>
            {rows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        )}
      </QueryContent>
      <button type="button" onClick={() => setPanel('Details')}>
        {panel}
      </button>
    </>
  )
}
async function mount(initial: string): Promise<void> {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/members/:member" element={<Page />} />
          <Route path="/members/:member/saved" element={<Page />} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}
it('uses a sibling path selection for both its link and the collection request', async () => {
  await mount('/members/Ada?page=3')
  expect(host.querySelectorAll('li')).toHaveLength(2)
  await act(async () =>
    host.querySelector<HTMLAnchorElement>('[data-mol-id="list-route-saved"]')!.click(),
  )
  expect(read).toHaveBeenLastCalledWith(true)
  expect(host.querySelectorAll('li')).toHaveLength(1)
  await act(async () => go(-1))
  expect(host.querySelectorAll('li')).toHaveLength(2)
  await act(async () => go(1))
  expect(host.querySelectorAll('li')).toHaveLength(1)
})
it('reads a direct sibling path without inventing a matching query flag', async () => {
  await mount('/members/Ada/saved?page=2')
  expect(read).toHaveBeenLastCalledWith(true)
  expect(host.querySelectorAll('li')).toHaveLength(1)
})
it('counterexample: an unrelated query flag and a local panel do not select a path view', async () => {
  await mount('/members/Ada?saved=1')
  expect(read).toHaveBeenLastCalledWith(false)
  expect(host.querySelectorAll('li')).toHaveLength(2)
  act(() => host.querySelector('button')!.click())
  expect(host.querySelector('button')!.textContent).toBe('Details')
  expect(host.querySelectorAll('li')).toHaveLength(2)
})
