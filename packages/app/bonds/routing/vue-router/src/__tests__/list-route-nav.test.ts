// @vitest-environment jsdom
/**
 * The React bond's `list-route-nav` titles, ported to Vue Router. Every title drives the
 * port's real native router: a REAL Vue Router over `createMemoryHistory()` with the app
 * mounted on it and NO molecule provider, exactly as React's titles need none.
 *
 * Where a title's body names a React-only thing, a one-line comment says what the port's
 * test does instead.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { type App, createApp, defineComponent, h, ref, type VNode } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  RouterView,
  useRoute,
  useRouter,
} from 'vue-router'

import type { ListRouteNavItem, ListRouteNavProps } from '../ListRouteNav.js'
import { ListRouteNav } from '../ListRouteNav.js'
import { useListRoute } from '../useListRoute.js'
import { settle } from './routing-harness.js'

let host: HTMLDivElement | undefined
let app: App | undefined
let go: ((delta: number) => Promise<void>) | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  host?.remove()
  host = undefined
  go = undefined
  window.history.replaceState(null, '', '/')
})

/**
 * Mount the real router, route params, list rules and navigation without mocks.
 *
 * @param initial - The address the router opens on.
 * @param selections - The declared views.
 * @param props - The other `ListRouteNav` props for the page.
 */
async function mount(
  initial: string,
  selections: Record<string, ListRouteNavItem>,
  props: Partial<Omit<ListRouteNavProps, 'selections'>> = {},
): Promise<void> {
  const Page = defineComponent({
    setup() {
      const route = useRoute()
      const vueRouter = useRouter()
      const list = useListRoute(() => ({
        selections,
        pageParam: props.pageParam,
        auth: props.auth,
      }))
      const panel = ref('preview')
      go = async (delta) => {
        vueRouter.go(delta)
        await settle()
      }
      return (): VNode =>
        h('div', [
          h(ListRouteNav, { 'aria-label': 'Library views', ...props, selections }),
          h('output', { 'data-testid': 'url' }, route.fullPath),
          h('output', { 'data-testid': 'page' }, String(list.value.page)),
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                panel.value = 'details'
              },
            },
            'Local details panel',
          ),
          h('output', { 'data-testid': 'panel' }, panel.value),
        ])
    },
  })
  const routes: RouteRecordRaw[] = [
    '/shelves/:shelf',
    '/members/:member',
    '/members/:member/saved',
    '/:pathMatch(.*)*',
  ].map((path) => ({ path, component: Page }))
  const vueRouter = createRouter({ history: createMemoryHistory(), routes })
  await vueRouter.replace(initial)
  await vueRouter.isReady()
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({ render: () => h(RouterView) })
  app.use(vueRouter)
  app.mount(host)
  await settle()
}

/** Mount one routed page, for the titles whose page is their own. */
async function mountPage(initial: string, routes: RouteRecordRaw[]): Promise<void> {
  const vueRouter = createRouter({ history: createMemoryHistory(), routes })
  await vueRouter.replace(initial)
  await vueRouter.isReady()
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({ render: () => h(RouterView) })
  app.use(vueRouter)
  app.mount(host)
  await settle()
}

/** Read a mounted consumer's location or list state. */
const read = (name: string): string | null =>
  host?.querySelector(`[data-testid="${name}"]`)?.textContent ?? null

/** Find a choice by its app-owned selection key. */
const choice = (selection: string): HTMLElement => {
  const node = host?.querySelector<HTMLElement>(`[data-mol-id="list-route-${selection}"]`)
  expect(node, `declared choice ${selection} must remain rendered`).not.toBeNull()
  return node!
}

/** Click a declared choice and let the router commit the navigation. */
const clickChoice = async (selection: string): Promise<void> => {
  choice(selection).click()
  await settle()
}

const library = {
  all: { path: '/library', label: 'All books' },
  shelf: { path: '/shelves/:shelf', label: 'This shelf', params: { shelf: 'reference' } },
} satisfies Record<string, ListRouteNavItem>

describe('ListRouteNav URL-selected navigation', () => {
  it('uses the same literal route to select the active link and the rendered list', async () => {
    const selections = {
      open: { path: '/members/:member', label: 'Open work' },
      saved: { path: '/members/:member/saved', label: 'Saved work' },
    }
    const rows: Record<string, string> = {
      open: 'Draft contract',
      saved: 'Signed contract',
    }
    const Page = defineComponent({
      setup: () => (): VNode =>
        h(ListRouteNav, {
          'aria-label': 'Member work',
          selections,
          children: ({ selection }) =>
            h('output', { 'data-testid': 'rows' }, selection && rows[selection]),
        }),
    })
    await mountPage('/members/morgan/saved', [{ path: '/members/:member/:view?', component: Page }])
    expect(read('rows')).toBe('Signed contract')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    await clickChoice('open')
    expect(read('rows')).toBe('Draft contract')
    expect(choice('open').getAttribute('aria-current')).toBe('page')
  })

  it('keeps loaded filter links visible while the new selection loads its rows', async () => {
    const selections = {
      all: { path: '/library', label: 'All books' },
      history: { path: '/library/:shelf', params: { shelf: 'history' }, label: 'History' },
      fiction: { path: '/library/:shelf', params: { shelf: 'fiction' }, label: 'Fiction' },
    }
    const rows: Record<string, string> = {
      all: 'All books',
      history: 'Loading history',
      fiction: 'Loading fiction',
    }
    const Page = defineComponent({
      setup: () => (): VNode =>
        h(ListRouteNav, {
          'aria-label': 'Filter books',
          selections,
          children: ({ selection }) =>
            h('output', { 'data-testid': 'rows' }, selection && rows[selection]),
        }),
    })
    await mountPage('/library', [{ path: '/library/:shelf?', component: Page }])
    const history = choice('history')
    await clickChoice('history')
    expect(read('rows')).toBe('Loading history')
    expect(choice('history')).toBe(history)
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('fiction').getAttribute('href')).toBe('/library/fiction')
  })

  it('keeps list markup while a named destination resets the page and leaves its source path', async () => {
    await mount('/shelves/reference?page=2&sort=title', library, {
      list: { className: 'library-menu', itemClassName: 'library-menu-item' },
      linkClassName: ({ active }) => (active ? 'selected' : 'choice'),
    })
    const all = choice('all')
    expect(all.closest('nav > ul.library-menu > li.library-menu-item')).not.toBeNull()
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(all.getAttribute('href')).toBe('/library?sort=title')
    await clickChoice('all')
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
    await mount('/members/Ada%20Lovelace?page=3', memberViews)
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
    expect(choice('saved').getAttribute('href')).toBe('/members/Ada%20Lovelace/saved')
    await clickChoice('saved')
    expect(read('url')).toBe('/members/Ada%20Lovelace/saved')
    expect(read('page')).toBe('1')
    expect(choice('saved').getAttribute('aria-current')).toBe('page')
    expect(choice('authored').getAttribute('href')).toBe('/members/Ada%20Lovelace')
    await clickChoice('authored')
    expect(read('url')).toBe('/members/Ada%20Lovelace')
    expect(choice('authored').getAttribute('aria-current')).toBe('page')
  })

  it('keeps every declared choice visible on a parameterized route', async () => {
    await mount('/shelves/reference?page=2', library)
    expect(host!.querySelectorAll('nav a')).toHaveLength(2)
    expect(choice('all').textContent).toBe('All books')
    expect(choice('all').getAttribute('href')).toBe('/library')
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    expect(choice('all').hasAttribute('aria-current')).toBe(false)
  })

  it('navigates to the declared base view from a parameterized view and resets the page', async () => {
    await mount('/shelves/reference?page=2', library)
    await clickChoice('all')
    expect(read('url')).toBe('/library')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
    expect(host!.querySelectorAll('nav a')).toHaveLength(2)
  })

  it('derives query-selected views from direct visits and retains unrelated queries and hash', async () => {
    await mount('/orders?view=open&page=3&campaign=mail#rows', {
      all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
      open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
    })
    expect(choice('open').getAttribute('aria-current')).toBe('page')
    expect(choice('all').getAttribute('href')).toBe('/orders?campaign=mail#rows')
    await clickChoice('all')
    expect(read('url')).toBe('/orders?campaign=mail#rows')
    expect(read('page')).toBe('1')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('restores the URL-selected choice and page on Back and Forward', async () => {
    await mount('/shelves/reference?page=2', library)
    await clickChoice('all')
    // React moves through React Router's own navigate(-1); the port moves the Vue Router.
    await go!(-1)
    expect(read('url')).toBe('/shelves/reference?page=2')
    expect(read('page')).toBe('2')
    expect(choice('shelf').getAttribute('aria-current')).toBe('page')
    await go!(1)
    expect(read('url')).toBe('/library')
    expect(choice('all').getAttribute('aria-current')).toBe('page')
  })

  it('uses each destination parameter and a custom pagination key', async () => {
    await mount('/shelves/history?cursorPage=4', library, { pageParam: 'cursorPage' })
    expect(choice('shelf').getAttribute('href')).toBe('/shelves/reference')
    await clickChoice('shelf')
    expect(read('url')).toBe('/shelves/reference')
    expect(read('page')).toBe('1')
  })

  it('distinguishes choices sharing a path pattern with different destination parameters', async () => {
    await mount('/shelves/history?page=2', {
      reference: { path: '/shelves/:shelf', params: { shelf: 'reference' }, label: 'Reference' },
      history: { path: '/shelves/:shelf', params: { shelf: 'history' }, label: 'History' },
    })
    expect(choice('history').getAttribute('aria-current')).toBe('page')
    expect(choice('reference').hasAttribute('aria-current')).toBe(false)
    await clickChoice('reference')
    expect(read('url')).toBe('/shelves/reference')
    expect(choice('reference').getAttribute('aria-current')).toBe('page')
    expect(choice('history').hasAttribute('aria-current')).toBe(false)
  })

  it('keeps disabled choices visible without an actionable destination', async () => {
    await mount('/library?page=2', { ...library, shelf: { ...library.shelf, disabled: true } })
    expect(choice('shelf').getAttribute('aria-disabled')).toBe('true')
    expect(choice('shelf').hasAttribute('href')).toBe(false)
    await clickChoice('shelf')
    expect(read('url')).toBe('/library?page=2')
  })

  it('passes native nav attributes and URL-derived styling without tab-panel semantics', async () => {
    await mount('/library?page=2', library, {
      'aria-label': 'Book categories',
      id: 'book-views',
      linkClassName: ({ active }) => (active ? 'chosen' : 'available'),
    })
    const nav = host!.querySelector('nav')!
    expect(nav.id).toBe('book-views')
    expect(nav.getAttribute('aria-label')).toBe('Book categories')
    expect(choice('all').className).toBe('chosen')
    expect(choice('shelf').className).toBe('available')
    expect(host!.querySelector('[role="tablist"]')).toBeNull()
  })

  it('leaves modified link clicks to the browser', async () => {
    await mount('/shelves/reference?page=2', library)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    let routerPrevented: boolean | undefined
    // Observe after the link's own listener, then cancel jsdom's unsupported document
    // navigation (React's test does the same after React's listener).
    document.addEventListener(
      'click',
      (event) => {
        routerPrevented = event.defaultPrevented
        event.preventDefault()
      },
      { once: true },
    )
    choice('all').dispatchEvent(click)
    await settle()
    expect(routerPrevented).toBe(false)
    expect(read('url')).toBe('/shelves/reference?page=2')
  })

  it('allows a genuinely local panel to change without navigation', async () => {
    await mount('/library?page=2', library)
    host!.querySelector('button')!.click()
    await settle()
    expect(read('panel')).toBe('details')
    expect(read('url')).toBe('/library?page=2')
    expect(read('page')).toBe('2')
  })
})
