// @vitest-environment jsdom
/**
 * The React bond's `list-route-nav` titles, ported to SvelteKit. Every title drives kit's
 * REAL client router over the test app (`./kit-app`): the root layout builds the bond's
 * router over it, and the probe page (`kit-app/src/lib/ProbePage.svelte`) renders the same
 * DOM React's `ListRouteNav` does from the same declaration. React's page component, its
 * `MemoryRouter` and its `<Route>` elements have no SvelteKit counterpart — kit mounts
 * pages from files — so the cases use the probe routes under `/probe` in the test app, and
 * every href assertion is compared with kit's own `resolve(path)` (the base path, or `#`
 * under hash routing) as a kit link carries it. The shared test app already pins `/library`
 * and `/shelves/[shelf]` to other pages, hence the `/probe` subtree.
 */
import { afterEach, describe, expect, it } from 'vitest'

import {
  type ProbeScenario,
  type ProbeSelection,
  setProbeScenario,
} from './kit-app/src/lib/probe.js'
import { awaitNavigation, documentUrl, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

/** The href a kit link to `path` carries in this project's configuration. */
const href = (path: string): string => {
  if (!kit) throw new Error('no started app')
  return kit.app.resolve(path)
}

/**
 * Starts the test app at `initial` with `scenario`, and waits until kit has committed.
 *
 * @param initial - The in-app address kit opens on.
 * @param scenario - The declarations the probe page renders.
 */
async function open(initial: string, scenario: ProbeScenario): Promise<void> {
  setProbeScenario(scenario)
  container = document.createElement('div')
  document.body.append(container)
  kit = await startKit(documentUrl(initial), container)
  await idle()
}

/** Read a mounted consumer's location or list state. */
const read = (name: string): string | null =>
  container?.querySelector(`[data-testid="${name}"]`)?.textContent ?? null

/** Find a choice by its app-owned selection key. */
const choice = (selection: string): HTMLElement => {
  const node = container?.querySelector<HTMLElement>(`[data-mol-id="list-route-${selection}"]`)
  expect(node, `declared choice ${selection} must remain rendered`).not.toBeNull()
  return node!
}

/** Waits until kit finished every navigation it started. */
const idle = async (): Promise<void> => {
  if (!kit) throw new Error('no started app')
  for (let i = 0; i < 500 && !kit.app.idle(); i++) await new Promise((done) => setTimeout(done, 0))
}

/** Click a declared choice and let kit commit the navigation it starts. */
const clickChoice = async (selection: string): Promise<void> => {
  if (!kit) throw new Error('no started app')
  const element = choice(selection)
  await awaitNavigation(kit.app, () => element.click())
  await idle()
}

/** Click a choice that must not navigate (a disabled one) and let any task run. */
const clickWithoutNavigation = async (selection: string): Promise<void> => {
  choice(selection).click()
  await new Promise((done) => setTimeout(done, 0))
}

/** Go back or forward one history entry through the browser, as kit follows it. */
const historyMove = async (delta: -1 | 1): Promise<void> => {
  if (!kit) throw new Error('no started app')
  await awaitNavigation(kit.app, () =>
    delta === -1 ? window.history.back() : window.history.forward(),
  )
  await idle()
}

const library = {
  all: { path: '/probe/library', label: 'All books' },
  shelf: { path: '/probe/shelves/:shelf', label: 'This shelf', params: { shelf: 'reference' } },
} satisfies Record<string, ProbeSelection>

const memberViews = {
  authored: { path: '/probe/members/:member', label: 'Authored entries' },
  saved: { path: '/probe/members/:member/saved', label: 'Saved entries' },
} satisfies Record<string, ProbeSelection>

describe('ListRouteNav URL-selected navigation', () => {
  it('uses the same literal route to select the active link and the rendered list', async () => {
    const selections = {
      open: { path: '/probe/members/:member', label: 'Open work' },
      saved: { path: '/probe/members/:member/saved', label: 'Saved work' },
    } satisfies Record<string, ProbeSelection>
    const rows: Record<string, string> = {
      open: 'Draft contract',
      saved: 'Signed contract',
    }

    await open('/probe/members/morgan/saved', {
      ariaLabel: 'Member work',
      selections,
      rows,
    })
    expect(read('rows')).toBe('Signed contract')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    await clickChoice('open')
    expect(read('rows')).toBe('Draft contract')
    expect(choice('open').getAttribute('aria-current')).toBe('page')
  })

  it('keeps loaded filter links visible while the new selection loads its rows', async () => {
    const selections = {
      all: { path: '/probe/library', label: 'All books' },
      history: { path: '/probe/library/:shelf', params: { shelf: 'history' }, label: 'History' },
      fiction: { path: '/probe/library/:shelf', params: { shelf: 'fiction' }, label: 'Fiction' },
    } satisfies Record<string, ProbeSelection>
    const rows: Record<string, string> = {
      all: 'All books',
      history: 'Loading history',
      fiction: 'Loading fiction',
    }

    await open('/probe/library', { ariaLabel: 'Filter books', selections, rows })
    const history = choice('history')
    await clickChoice('history')
    expect(read('rows')).toBe('Loading history')
    expect(choice('history')).toBe(history)
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('fiction').getAttribute('href')).toBe(href('/probe/library/fiction'))
  })

  it('keeps list markup while a named destination resets the page and leaves its source path', async () => {
    await open('/probe/shelves/reference?page=2&sort=title', {
      ariaLabel: 'Library views',
      selections: library,
      list: { className: 'library-menu', itemClassName: 'library-menu-item' },
      linkClassName: ({ active }) => (active ? 'selected' : 'choice'),
    })
    const all = choice('all')
    expect(all.closest('nav > ul.library-menu > li.library-menu-item')).not.toBeNull()
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(all.getAttribute('href')).toBe(href('/probe/library?sort=title'))
    await clickChoice('all')
    expect(read('url')).toBe('/probe/library?sort=title')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(choice('all').className).toBe('selected')
  })

  it('keeps a sibling view destination independent of the currently selected view', async () => {
    await open('/probe/members/Ada%20Lovelace?page=3', {
      ariaLabel: 'Library views',
      selections: memberViews,
    })
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
    expect(choice('saved').getAttribute('href')).toBe(href('/probe/members/Ada%20Lovelace/saved'))
    await clickChoice('saved')
    expect(read('url')).toBe('/probe/members/Ada%20Lovelace/saved')
    expect(read('page')).toBe('1')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    expect(choice('authored').getAttribute('href')).toBe(href('/probe/members/Ada%20Lovelace'))
    await clickChoice('authored')
    expect(read('url')).toBe('/probe/members/Ada%20Lovelace')
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
  })

  it('keeps every declared choice visible on a parameterized route', async () => {
    await open('/probe/shelves/reference?page=2', {
      ariaLabel: 'Library views',
      selections: library,
    })
    expect(container!.querySelectorAll('nav a')).toHaveLength(2)
    expect(choice('all').textContent).toBe('All books')
    expect(choice('all').getAttribute('href')).toBe(href('/probe/library'))
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(choice('all').hasAttribute('aria-current')).toBe(false)
  })

  it('navigates to the declared base view from a parameterized view and resets the page', async () => {
    await open('/probe/shelves/reference?page=2', {
      ariaLabel: 'Library views',
      selections: library,
    })
    await clickChoice('all')
    expect(read('url')).toBe('/probe/library')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(container!.querySelectorAll('nav a')).toHaveLength(2)
  })

  it('derives query-selected views from direct visits and retains unrelated queries and hash', async () => {
    await open('/probe/orders?view=open&page=3&campaign=mail#rows', {
      ariaLabel: 'Library views',
      selections: {
        all: { path: '/probe/orders', query: { view: undefined }, label: 'All orders' },
        open: { path: '/probe/orders', query: { view: 'open' }, label: 'Open orders' },
      },
    })
    expect(choice('open').getAttribute('aria-current')).toBe('page')
    expect(choice('all').getAttribute('href')).toBe(href('/probe/orders?campaign=mail#rows'))
    await clickChoice('all')
    expect(read('url')).toBe('/probe/orders?campaign=mail#rows')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('restores the URL-selected choice and page on Back and Forward', async () => {
    await open('/probe/shelves/reference?page=2', {
      ariaLabel: 'Library views',
      selections: library,
    })
    await clickChoice('all')
    // React moves through React Router's own navigate(-1); here the browser moves and kit
    // follows popstate, as a person's Back button does.
    await historyMove(-1)
    expect(read('url')).toBe('/probe/shelves/reference?page=2')
    expect(read('page')).toBe('2')
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    await historyMove(1)
    expect(read('url')).toBe('/probe/library')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('uses each destination parameter and a custom pagination key', async () => {
    await open('/probe/shelves/history?cursorPage=4', {
      ariaLabel: 'Library views',
      selections: library,
      pageParam: 'cursorPage',
    })
    expect(choice('shelf').getAttribute('href')).toBe(href('/probe/shelves/reference'))
    await clickChoice('shelf')
    expect(read('url')).toBe('/probe/shelves/reference')
    expect(read('page')).toBe('1')
  })

  it('distinguishes choices sharing a path pattern with different destination parameters', async () => {
    await open('/probe/shelves/history?page=2', {
      ariaLabel: 'Library views',
      selections: {
        reference: {
          path: '/probe/shelves/:shelf',
          params: { shelf: 'reference' },
          label: 'Reference',
        },
        history: { path: '/probe/shelves/:shelf', params: { shelf: 'history' }, label: 'History' },
      },
    })
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('reference').hasAttribute('aria-current')).toBe(false)
    await clickChoice('reference')
    expect(read('url')).toBe('/probe/shelves/reference')
    expect(choice('reference').getAttribute('aria-current')).toBe('page')
    expect(choice('history').hasAttribute('aria-current')).toBe(false)
  })

  it('keeps disabled choices visible without an actionable destination', async () => {
    await open('/probe/library?page=2', {
      ariaLabel: 'Library views',
      selections: { ...library, shelf: { ...library.shelf, disabled: true } },
    })
    expect(choice('shelf').getAttribute('aria-disabled')).toBe('true')
    expect(choice('shelf').hasAttribute('href')).toBe(false)
    await clickWithoutNavigation('shelf')
    expect(read('url')).toBe('/probe/library?page=2')
  })

  it('passes native nav attributes and URL-derived styling without tab-panel semantics', async () => {
    await open('/probe/library?page=2', {
      ariaLabel: 'Book categories',
      navId: 'book-views',
      selections: library,
      linkClassName: ({ active }) => (active ? 'chosen' : 'available'),
    })
    const nav = container!.querySelector('nav')!
    expect(nav.id).toBe('book-views')
    expect(nav.getAttribute('aria-label')).toBe('Book categories')
    expect(choice('all').className).toBe('chosen')
    expect(choice('shelf').className).toBe('available')
    expect(container!.querySelector('[role="tablist"]')).toBeNull()
  })

  it('leaves modified link clicks to the browser', async () => {
    await open('/probe/shelves/reference?page=2', {
      ariaLabel: 'Library views',
      selections: library,
    })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    let routerPrevented: boolean | undefined
    // Observe after kit's link handler, then cancel jsdom's unsupported document navigation.
    document.addEventListener(
      'click',
      (event) => {
        routerPrevented = event.defaultPrevented
        event.preventDefault()
      },
      { once: true },
    )
    choice('all').dispatchEvent(click)
    await new Promise((done) => setTimeout(done, 0))
    expect(routerPrevented).toBe(false)
    expect(read('url')).toBe('/probe/shelves/reference?page=2')
  })

  it('allows a genuinely local panel to change without navigation', async () => {
    await open('/probe/library?page=2', { ariaLabel: 'Library views', selections: library })
    container!.querySelector('button')!.click()
    await new Promise((done) => setTimeout(done, 0))
    expect(read('panel')).toBe('details')
    expect(read('url')).toBe('/probe/library?page=2')
    expect(read('page')).toBe('2')
  })
})
