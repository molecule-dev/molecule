// @vitest-environment jsdom
/**
 * The titles of React's `list-route-nav.test.tsx`, over this bond's real Solid Router: the
 * same selections, routes and steps. React re-renders the page on every navigation; Solid
 * runs a component once, so the nav sits in the router's persistent `root` above the
 * outlet (it keeps its DOM across route changes, as React's fragment does) and everything
 * that follows the URL is read through the hook's accessors.
 */
import type { Navigator, RouteSectionProps } from '@solidjs/router'
import { MemoryRouter, Route, useLocation, useNavigate } from '@solidjs/router'
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ListRouteNav, type ListRouteNavItem, type ListRouteNavProps } from '../ListRouteNav.jsx'
import { createSolidMemoryHistory } from '../memory-history.js'
import { useListRoute } from '../use-list-route.js'

let host: HTMLDivElement
let dispose: (() => void) | undefined
let go: Navigator | undefined

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  go = undefined
  host.remove()
})

/** Flushes macrotasks so a navigation in flight and the list it re-resolves settle. */
async function settle(): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/** A route component that renders nothing: a case's nav is the only thing on screen. */
const Nothing = (): JSX.Element => null

/** Read a mounted consumer's location or list state. */
const read = (name: string): string | null =>
  host.querySelector(`[data-testid="${name}"]`)?.textContent ?? null

/** Find a choice by its app-owned selection key. */
const choice = (selection: string): HTMLElement => {
  const node = host.querySelector<HTMLElement>(`[data-mol-id="list-route-${selection}"]`)
  if (node === null) throw new Error(`declared choice ${selection} must remain rendered`)
  return node
}

const library = {
  all: { path: '/library', label: 'All books' },
  shelf: { path: '/shelves/:shelf', label: 'This shelf', params: { shelf: 'reference' } },
} satisfies Record<string, ListRouteNavItem>

/**
 * Mount the real router, route params, list rules and navigation without mocks: the nav in
 * the router's `root`, a page below it rendering the URL, the page and a local panel.
 *
 * @param initial - Where the native router starts.
 * @param selections - The declared list views.
 * @param props - The rest of the nav's props.
 */
function mount(
  initial: string,
  selections: Record<string, ListRouteNavItem>,
  props: Partial<Omit<ListRouteNavProps, 'selections'>> = {},
): void {
  const history = createSolidMemoryHistory([initial])

  const Shell = (shell: RouteSectionProps): JSX.Element => (
    <>
      <ListRouteNav aria-label="Library views" {...props} selections={selections} />
      {shell.children}
    </>
  )

  const Page = (): JSX.Element => {
    const location = useLocation()
    const list = useListRoute({ selections, pageParam: props.pageParam, auth: props.auth })
    const [panel, setPanel] = createSignal('preview')
    go = useNavigate()
    return (
      <>
        <output data-testid="url">{location.pathname + location.search + location.hash}</output>
        <output data-testid="page">{list.page()}</output>
        <button type="button" onClick={() => setPanel('details')}>
          Local details panel
        </button>
        <output data-testid="panel">{panel()}</output>
      </>
    )
  }

  dispose = render(
    () => (
      <MemoryRouter history={history} root={Shell}>
        <Route path="/shelves/:shelf" component={Page} />
        <Route path="/members/:member" component={Page} />
        <Route path="/members/:member/saved" component={Page} />
        <Route path="*" component={Page} />
      </MemoryRouter>
    ),
    host,
  )
}

describe('ListRouteNav URL-selected navigation', () => {
  it('uses the same literal route to select the active link and the rendered list', async () => {
    const selections = {
      open: { path: '/members/:member', label: 'Open work' },
      saved: { path: '/members/:member/saved', label: 'Saved work' },
    }
    const rows = { open: 'Draft contract', saved: 'Signed contract' }
    const history = createSolidMemoryHistory(['/members/morgan/saved'])

    const Shell = (): JSX.Element => (
      <ListRouteNav aria-label="Member work" selections={selections}>
        {(route) => <output data-testid="rows">{route.selection && rows[route.selection]}</output>}
      </ListRouteNav>
    )

    dispose = render(
      () => (
        <MemoryRouter history={history} root={Shell}>
          <Route path="/members/:member/:view?" component={Nothing} />
        </MemoryRouter>
      ),
      host,
    )
    expect(read('rows')).toBe('Signed contract')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    choice('open').click()
    await settle()
    expect(read('rows')).toBe('Draft contract')
    expect(choice('open').getAttribute('aria-current')).toBe('page')
  })

  it('keeps loaded filter links visible while the new selection loads its rows', async () => {
    const selections = {
      all: { path: '/library', label: 'All books' },
      history: { path: '/library/:shelf', params: { shelf: 'history' }, label: 'History' },
      fiction: { path: '/library/:shelf', params: { shelf: 'fiction' }, label: 'Fiction' },
    }
    const rows = { all: 'All books', history: 'Loading history', fiction: 'Loading fiction' }
    const context = createSolidMemoryHistory(['/library'])

    const Shell = (): JSX.Element => (
      <ListRouteNav aria-label="Filter books" selections={selections}>
        {(route) => <output data-testid="rows">{route.selection && rows[route.selection]}</output>}
      </ListRouteNav>
    )

    dispose = render(
      () => (
        <MemoryRouter history={context} root={Shell}>
          <Route path="/library/:shelf?" component={Nothing} />
        </MemoryRouter>
      ),
      host,
    )
    const history = choice('history')
    history.click()
    await settle()
    expect(read('rows')).toBe('Loading history')
    expect(choice('history')).toBe(history)
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('fiction').getAttribute('href')).toBe('/library/fiction')
  })

  it('keeps list markup while a named destination resets the page and leaves its source path', async () => {
    mount('/shelves/reference?page=2&sort=title', library, {
      list: { className: 'library-menu', itemClassName: 'library-menu-item' },
      linkClassName: ({ active }) => (active ? 'selected' : 'choice'),
    })
    const all = choice('all')
    expect(all.closest('nav > ul.library-menu > li.library-menu-item')).not.toBeNull()
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(all.getAttribute('href')).toBe('/library?sort=title')
    all.click()
    await settle()
    expect(read('url')).toBe('/library?sort=title')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(choice('all').className).toBe('selected')
  })

  it('keeps a sibling view destination independent of the currently selected view', async () => {
    const memberViews = {
      authored: { path: '/members/:member', label: 'Authored entries' },
      saved: { path: '/members/:member/saved', label: 'Saved entries' },
    } satisfies Record<string, ListRouteNavItem>
    mount('/members/Ada%20Lovelace?page=3', memberViews)
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
    expect(choice('saved').getAttribute('href')).toBe('/members/Ada%20Lovelace/saved')
    choice('saved').click()
    await settle()
    expect(read('url')).toBe('/members/Ada%20Lovelace/saved')
    expect(read('page')).toBe('1')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    expect(choice('authored').getAttribute('href')).toBe('/members/Ada%20Lovelace')
    choice('authored').click()
    await settle()
    expect(read('url')).toBe('/members/Ada%20Lovelace')
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
  })

  it('keeps every declared choice visible on a parameterized route', () => {
    mount('/shelves/reference?page=2', library)
    expect(host.querySelectorAll('nav a')).toHaveLength(2)
    expect(choice('all').textContent).toBe('All books')
    expect(choice('all').getAttribute('href')).toBe('/library')
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(choice('all').hasAttribute('aria-current')).toBe(false)
  })

  it('navigates to the declared base view from a parameterized view and resets the page', async () => {
    mount('/shelves/reference?page=2', library)
    choice('all').click()
    await settle()
    expect(read('url')).toBe('/library')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(host.querySelectorAll('nav a')).toHaveLength(2)
  })

  it('derives query-selected views from direct visits and retains unrelated queries and hash', async () => {
    mount('/orders?view=open&page=3&campaign=mail#rows', {
      all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
      open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
    })
    expect(choice('open').getAttribute('aria-current')).toBe('page')
    expect(choice('all').getAttribute('href')).toBe('/orders?campaign=mail#rows')
    choice('all').click()
    await settle()
    expect(read('url')).toBe('/orders?campaign=mail#rows')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('restores the URL-selected choice and page on Back and Forward', async () => {
    mount('/shelves/reference?page=2', library)
    choice('all').click()
    await settle()
    go?.(-1)
    await settle()
    expect(read('url')).toBe('/shelves/reference?page=2')
    expect(read('page')).toBe('2')
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    go?.(1)
    await settle()
    expect(read('url')).toBe('/library')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('uses each destination parameter and a custom pagination key', async () => {
    mount('/shelves/history?cursorPage=4', library, { pageParam: 'cursorPage' })
    expect(choice('shelf').getAttribute('href')).toBe('/shelves/reference')
    choice('shelf').click()
    await settle()
    expect(read('url')).toBe('/shelves/reference')
    expect(read('page')).toBe('1')
  })

  it('distinguishes choices sharing a path pattern with different destination parameters', async () => {
    mount('/shelves/history?page=2', {
      reference: { path: '/shelves/:shelf', params: { shelf: 'reference' }, label: 'Reference' },
      history: { path: '/shelves/:shelf', params: { shelf: 'history' }, label: 'History' },
    })
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('reference').hasAttribute('aria-current')).toBe(false)
    choice('reference').click()
    await settle()
    expect(read('url')).toBe('/shelves/reference')
    expect(choice('reference').getAttribute('aria-current')).toBe('page')
    expect(choice('history').hasAttribute('aria-current')).toBe(false)
  })

  it('keeps disabled choices visible without an actionable destination', async () => {
    mount('/library?page=2', { ...library, shelf: { ...library.shelf, disabled: true } })
    expect(choice('shelf').getAttribute('aria-disabled')).toBe('true')
    expect(choice('shelf').hasAttribute('href')).toBe(false)
    choice('shelf').click()
    await settle()
    expect(read('url')).toBe('/library?page=2')
  })

  it('passes native nav attributes and URL-derived styling without tab-panel semantics', () => {
    mount('/library?page=2', library, {
      'aria-label': 'Book categories',
      id: 'book-views',
      linkClassName: ({ active }) => (active ? 'chosen' : 'available'),
    })
    const nav = host.querySelector('nav')!
    expect(nav.id).toBe('book-views')
    expect(nav.getAttribute('aria-label')).toBe('Book categories')
    expect(choice('all').className).toBe('chosen')
    expect(choice('shelf').className).toBe('available')
    expect(host.querySelector('[role="tablist"]')).toBeNull()
  })

  it('leaves modified link clicks to the browser', () => {
    mount('/shelves/reference?page=2', library)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    let routerPrevented: boolean | undefined
    // Observe after Solid Router's and the component's listener, then cancel jsdom's
    // unsupported document navigation.
    document.addEventListener(
      'click',
      (event) => {
        routerPrevented = event.defaultPrevented
        event.preventDefault()
      },
      { once: true },
    )
    choice('all').dispatchEvent(click)
    expect(routerPrevented).toBe(false)
    expect(read('url')).toBe('/shelves/reference?page=2')
  })

  it('allows a genuinely local panel to change without navigation', () => {
    mount('/library?page=2', library)
    host.querySelector('button')!.click()
    expect(read('panel')).toBe('details')
    expect(read('url')).toBe('/library?page=2')
    expect(read('page')).toBe('2')
  })
})
