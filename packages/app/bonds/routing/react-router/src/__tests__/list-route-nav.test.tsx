// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ListRouteNav, type ListRouteNavItem, type ListRouteNavProps } from '../ListRouteNav.js'
import { MemoryRouter } from '../routers.js'
import { useListRoute } from '../useListRoute.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root
let go: ReturnType<typeof useNavigate>

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

/** Mount the real router, route params, list rules and navigation without mocks. */
function mount(
  initial: string,
  selections: Record<string, ListRouteNavItem>,
  props: Partial<Omit<ListRouteNavProps, 'selections'>> = {},
): void {
  function Page() {
    const location = useLocation()
    const list = useListRoute({ selections, pageParam: props.pageParam, auth: props.auth })
    const [panel, setPanel] = useState('preview')
    go = useNavigate()
    return (
      <>
        <ListRouteNav aria-label="Library views" {...props} selections={selections} />
        <output data-testid="url">{location.pathname + location.search + location.hash}</output>
        <output data-testid="page">{list.page}</output>
        <button type="button" onClick={() => setPanel('details')}>
          Local details panel
        </button>
        <output data-testid="panel">{panel}</output>
      </>
    )
  }

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/shelves/:shelf" element={<Page />} />
          <Route path="/members/:member" element={<Page />} />
          <Route path="/members/:member/saved" element={<Page />} />
          <Route path="*" element={<Page />} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

/** Read a mounted consumer's location or list state. */
const read = (name: string): string | null =>
  host.querySelector(`[data-testid="${name}"]`)?.textContent ?? null

/** Find a choice by its app-owned selection key. */
const choice = (selection: string): HTMLElement => {
  const node = host.querySelector<HTMLElement>(`[data-mol-id="list-route-${selection}"]`)
  expect(node, `declared choice ${selection} must remain rendered`).not.toBeNull()
  return node!
}

const library = {
  all: { path: '/library', label: 'All books' },
  shelf: { path: '/shelves/:shelf', label: 'This shelf', params: { shelf: 'reference' } },
} satisfies Record<string, ListRouteNavItem>

describe('ListRouteNav URL-selected navigation', () => {
  it('uses the same literal route to select the active link and the rendered list', () => {
    const selections = {
      open: { path: '/members/:member', label: 'Open work' },
      saved: { path: '/members/:member/saved', label: 'Saved work' },
    }
    const rows = { open: 'Draft contract', saved: 'Signed contract' }

    function Page() {
      return (
        <ListRouteNav aria-label="Member work" selections={selections}>
          {({ selection }) => <output data-testid="rows">{selection && rows[selection]}</output>}
        </ListRouteNav>
      )
    }

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/members/morgan/saved']}>
          <Routes>
            <Route path="/members/:member/:view?" element={<Page />} />
          </Routes>
        </MemoryRouter>,
      )
    })
    expect(read('rows')).toBe('Signed contract')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    act(() => choice('open').click())
    expect(read('rows')).toBe('Draft contract')
    expect(choice('open').getAttribute('aria-current')).toBe('page')
  })

  it('keeps loaded filter links visible while the new selection loads its rows', () => {
    const selections = {
      all: { path: '/library', label: 'All books' },
      history: { path: '/library/:shelf', params: { shelf: 'history' }, label: 'History' },
      fiction: { path: '/library/:shelf', params: { shelf: 'fiction' }, label: 'Fiction' },
    }
    const rows = { all: 'All books', history: 'Loading history', fiction: 'Loading fiction' }

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/library']}>
          <Routes>
            <Route
              path="/library/:shelf?"
              element={
                <ListRouteNav aria-label="Filter books" selections={selections}>
                  {({ selection }) => (
                    <output data-testid="rows">{selection && rows[selection]}</output>
                  )}
                </ListRouteNav>
              }
            />
          </Routes>
        </MemoryRouter>,
      )
    })
    const history = choice('history')
    act(() => history.click())
    expect(read('rows')).toBe('Loading history')
    expect(choice('history')).toBe(history)
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('fiction').getAttribute('href')).toBe('/library/fiction')
  })

  it('keeps list markup while a named destination resets the page and leaves its source path', () => {
    mount('/shelves/reference?page=2&sort=title', library, {
      list: { className: 'library-menu', itemClassName: 'library-menu-item' },
      linkClassName: ({ active }) => (active ? 'selected' : 'choice'),
    })
    const all = choice('all')
    expect(all.closest('nav > ul.library-menu > li.library-menu-item')).not.toBeNull()
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(all.getAttribute('href')).toBe('/library?sort=title')
    act(() => all.click())
    expect(read('url')).toBe('/library?sort=title')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(choice('all').className).toBe('selected')
  })

  it('keeps a sibling view destination independent of the currently selected view', () => {
    const memberViews = {
      authored: { path: '/members/:member', label: 'Authored entries' },
      saved: { path: '/members/:member/saved', label: 'Saved entries' },
    } satisfies Record<string, ListRouteNavItem>
    mount('/members/Ada%20Lovelace?page=3', memberViews)
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
    expect(choice('saved').getAttribute('href')).toBe('/members/Ada%20Lovelace/saved')
    act(() => choice('saved').click())
    expect(read('url')).toBe('/members/Ada%20Lovelace/saved')
    expect(read('page')).toBe('1')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    expect(choice('authored').getAttribute('href')).toBe('/members/Ada%20Lovelace')
    act(() => choice('authored').click())
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

  it('navigates to the declared base view from a parameterized view and resets the page', () => {
    mount('/shelves/reference?page=2', library)
    act(() => choice('all').click())
    expect(read('url')).toBe('/library')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(host.querySelectorAll('nav a')).toHaveLength(2)
  })

  it('derives query-selected views from direct visits and retains unrelated queries and hash', () => {
    mount('/orders?view=open&page=3&campaign=mail#rows', {
      all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
      open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
    })
    expect(choice('open').getAttribute('aria-current')).toBe('page')
    expect(choice('all').getAttribute('href')).toBe('/orders?campaign=mail#rows')
    act(() => choice('all').click())
    expect(read('url')).toBe('/orders?campaign=mail#rows')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('restores the URL-selected choice and page on Back and Forward', async () => {
    mount('/shelves/reference?page=2', library)
    act(() => choice('all').click())
    await act(async () => go(-1))
    expect(read('url')).toBe('/shelves/reference?page=2')
    expect(read('page')).toBe('2')
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    await act(async () => go(1))
    expect(read('url')).toBe('/library')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('uses each destination parameter and a custom pagination key', () => {
    mount('/shelves/history?cursorPage=4', library, { pageParam: 'cursorPage' })
    expect(choice('shelf').getAttribute('href')).toBe('/shelves/reference')
    act(() => choice('shelf').click())
    expect(read('url')).toBe('/shelves/reference')
    expect(read('page')).toBe('1')
  })

  it('distinguishes choices sharing a path pattern with different destination parameters', () => {
    mount('/shelves/history?page=2', {
      reference: { path: '/shelves/:shelf', params: { shelf: 'reference' }, label: 'Reference' },
      history: { path: '/shelves/:shelf', params: { shelf: 'history' }, label: 'History' },
    })
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('reference').hasAttribute('aria-current')).toBe(false)
    act(() => choice('reference').click())
    expect(read('url')).toBe('/shelves/reference')
    expect(choice('reference').getAttribute('aria-current')).toBe('page')
    expect(choice('history').hasAttribute('aria-current')).toBe(false)
  })

  it('keeps disabled choices visible without an actionable destination', () => {
    mount('/library?page=2', { ...library, shelf: { ...library.shelf, disabled: true } })
    expect(choice('shelf').getAttribute('aria-disabled')).toBe('true')
    expect(choice('shelf').hasAttribute('href')).toBe(false)
    act(() => choice('shelf').click())
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
    // Observe after React's listener, then cancel jsdom's unsupported document navigation.
    document.addEventListener(
      'click',
      (event) => {
        routerPrevented = event.defaultPrevented
        event.preventDefault()
      },
      { once: true },
    )
    act(() => choice('all').dispatchEvent(click))
    expect(routerPrevented).toBe(false)
    expect(read('url')).toBe('/shelves/reference?page=2')
  })

  it('allows a genuinely local panel to change without navigation', () => {
    mount('/library?page=2', library)
    act(() => host.querySelector('button')!.click())
    expect(read('panel')).toBe('details')
    expect(read('url')).toBe('/library?page=2')
    expect(read('page')).toBe('2')
  })
})
