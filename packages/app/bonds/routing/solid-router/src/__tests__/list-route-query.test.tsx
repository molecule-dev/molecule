// @vitest-environment jsdom
/**
 * The titles of React's `list-route-query.test.tsx`, over this bond's real Solid Router:
 * the same selections, the same collection reads, and `<A>` links built by
 * `useListRoute().href` where React used `ListRouteNav` (which this bond does not port).
 * The collection read replaces React's `useQuery` with a resource-shaped effect so the
 * helper stays inside this package's dependencies.
 */
import type { Navigator } from '@solidjs/router'
import { A, MemoryRouter, Route, useNavigate } from '@solidjs/router'
import { createEffect, createSignal, For, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { MoleculeRouterProvider } from '../index.js'
import { createSolidMemoryHistory } from '../memory-history.js'
import { useListRoute } from '../use-list-route.js'

const read = vi.fn(async (saved: boolean): Promise<string[]> =>
  saved ? ['Bolt'] : ['Bolt', 'Nut'],
)
const selections = {
  authored: { path: '/members/:member', label: 'Authored' },
  saved: { path: '/members/:member/saved', label: 'Saved' },
}
let host: HTMLDivElement
let dispose: (() => void) | undefined
let go: Navigator

beforeEach(() => {
  read.mockClear()
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  host.remove()
})

/** Flushes macrotasks so a navigation in flight and the read it started settle. */
async function settle(): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function Page(): JSX.Element {
  const list = useListRoute({ selections })
  const [panel, setPanel] = createSignal('Preview')
  const [rows, setRows] = createSignal<string[]>([])
  go = useNavigate()
  createEffect(() => {
    const saved = list.selection() === 'saved'
    void read(saved).then((value) => setRows(value))
  })
  return (
    <>
      {Object.keys(selections).map((selection) => (
        <A id={selection} href={list.href({ selection: selection as keyof typeof selections })}>
          {selections[selection as keyof typeof selections].label}
        </A>
      ))}
      <ul>
        <For each={rows()}>{(row) => <li>{row}</li>}</For>
      </ul>
      <button type="button" onClick={() => setPanel('Details')}>
        {panel()}
      </button>
    </>
  )
}

async function mount(initial: string): Promise<void> {
  const history = createSolidMemoryHistory([initial])
  dispose = render(
    () => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
        )}
      >
        <Route path="/members/:member" component={Page} />
        <Route path="/members/:member/saved" component={Page} />
      </MemoryRouter>
    ),
    host,
  )
  await settle()
}

it('uses a sibling path selection for both its link and the collection request', async () => {
  await mount('/members/Ada?page=3')
  expect(host.querySelectorAll('li')).toHaveLength(2)
  host.querySelector<HTMLAnchorElement>('[id="saved"]')!.click()
  await settle()
  expect(read).toHaveBeenLastCalledWith(true)
  expect(host.querySelectorAll('li')).toHaveLength(1)
  go(-1)
  await settle()
  expect(host.querySelectorAll('li')).toHaveLength(2)
  go(1)
  await settle()
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
  host.querySelector('button')!.click()
  await settle()
  expect(host.querySelector('button')!.textContent).toBe('Details')
  expect(host.querySelectorAll('li')).toHaveLength(2)
})
