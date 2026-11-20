// @vitest-environment jsdom
/**
 * The React bond's `list-route-query` titles, ported to SvelteKit. React's `useQuery` (from
 * `@molecule/app-query-react`) has no SvelteKit counterpart in this bond: the collection
 * request is the probe page's own async `read`, re-issued by the bond's `useListRoute`
 * selection React's page keys its query by, and rendered as a list once it answers. The
 * rest — kit's real client router, the probe routes under `/probe`, the URL-selected view —
 * is driven exactly as `list-route-nav.test.ts` drives it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProbeSelection } from './kit-app/src/lib/probe.js'
import { setProbeScenario } from './kit-app/src/lib/probe.js'
import { awaitNavigation, documentUrl, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

const selections = {
  authored: { path: '/probe/members/:member', label: 'Authored' },
  saved: { path: '/probe/members/:member/saved', label: 'Saved' },
} satisfies Record<string, ProbeSelection>

/** The collection request every case reads its list from. */
const read = vi.fn<(saved: boolean) => Promise<string[]>>(async (saved) =>
  saved ? ['Bolt'] : ['Bolt', 'Nut'],
)

/** Waits until kit finished every navigation it started. */
const idle = async (): Promise<void> => {
  if (!kit) throw new Error('no started app')
  for (let i = 0; i < 500 && !kit.app.idle(); i++) await new Promise((done) => setTimeout(done, 0))
}

/**
 * Starts the test app at `initial` with the member-view scenario.
 *
 * @param initial - The in-app address kit opens on.
 */
async function mount(initial: string): Promise<void> {
  read.mockClear()
  setProbeScenario({
    ariaLabel: 'Member entries',
    selections,
    read,
    initialPanel: 'Preview',
    nextPanel: 'Details',
    buttonShowsPanel: true,
  })
  container = document.createElement('div')
  document.body.append(container)
  kit = await startKit(documentUrl(initial), container)
  await idle()
  // The collection request answers in a microtask; render its rows before the case reads them.
  await new Promise((done) => setTimeout(done, 0))
}

/** Click a declared choice and let kit commit the navigation it starts. */
async function clickChoice(selection: string): Promise<void> {
  if (!kit) throw new Error('no started app')
  const element = container!.querySelector(`[data-mol-id="list-route-${selection}"]`)
  if (!(element instanceof HTMLElement)) throw new Error(`no choice "${selection}"`)
  await awaitNavigation(kit.app, () => element.click())
  await idle()
  await new Promise((done) => setTimeout(done, 0))
}

/** Go back or forward one history entry through the browser, as kit follows it. */
async function historyMove(delta: -1 | 1): Promise<void> {
  if (!kit) throw new Error('no started app')
  await awaitNavigation(kit.app, () =>
    delta === -1 ? window.history.back() : window.history.forward(),
  )
  await idle()
  await new Promise((done) => setTimeout(done, 0))
}

const rows = (): NodeListOf<HTMLLIElement> => container!.querySelectorAll('li')

describe('useListRoute over the real SvelteKit client', () => {
  it('uses a sibling path selection for both its link and the collection request', async () => {
    await mount('/probe/members/Ada?page=3')
    expect(rows()).toHaveLength(2)
    await clickChoice('saved')
    expect(read).toHaveBeenLastCalledWith(true)
    expect(rows()).toHaveLength(1)
    await historyMove(-1)
    expect(rows()).toHaveLength(2)
    await historyMove(1)
    expect(rows()).toHaveLength(1)
  })

  it('reads a direct sibling path without inventing a matching query flag', async () => {
    await mount('/probe/members/Ada/saved?page=2')
    expect(read).toHaveBeenLastCalledWith(true)
    expect(rows()).toHaveLength(1)
  })

  it('counterexample: an unrelated query flag and a local panel do not select a path view', async () => {
    await mount('/probe/members/Ada?saved=1')
    expect(read).toHaveBeenLastCalledWith(false)
    expect(rows()).toHaveLength(2)
    container!.querySelector('button')!.click()
    await new Promise((done) => setTimeout(done, 0))
    expect(container!.querySelector('button')!.textContent).toBe('Details')
    expect(rows()).toHaveLength(2)
  })
})
