// @vitest-environment jsdom
/**
 * `ListRouteNav` over a real Angular Router: the behaviour every URL-selected list
 * navigation has, under react-router `list-route-nav.test.tsx`'s titles.
 *
 * Each case boots a real Angular application (`provideRouter` over the browser history at
 * `PathLocationStrategy`), whose bootstrap root renders the nav plus the page state the
 * case asserts on. The routes are component-less: an Angular navigation re-matches and
 * hands the page the new params while the page — and so the nav and its links — stays
 * mounted, as React's matched-element tree does.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  type OnInit,
  type Signal,
  signal,
  type TemplateRef,
  type Type,
  ViewChild,
} from '@angular/core'
import type { Route } from '@angular/router'
import { afterEach, describe, expect, it } from 'vitest'

import { useMoleculeRouter } from '../hooks.js'
import {
  ListRouteNav,
  type ListRouteNavItem,
  type ListRouteNavItemState,
} from '../list-route-nav.js'
import type { ListRouteResult } from '../list-types.js'
import { useListRoute } from '../use-list-route.js'
import { bootApp, type BootedApp, historyMove } from './angular-app.js'

/** The routes every case can navigate to (Angular matches in declaration order). */
const routes: Route[] = [
  { path: 'library/:shelf', children: [] },
  { path: 'library', children: [] },
  { path: 'shelves/:shelf', children: [] },
  { path: 'members/:member/saved', children: [] },
  { path: 'members/:member/:view', children: [] },
  { path: 'members/:member', children: [] },
  { path: '**', children: [] },
]

/** What a case renders the nav with, in the React test's naming. */
interface MountProps {
  /** Accessible navigation name. */
  'aria-label'?: string
  /** A native `id` on the nav. */
  id?: string
  /** Tie-breaker or fallback selection. */
  defaultSelection?: string
  /** The pagination query key. */
  pageParam?: string
  /** List markup with optional classes. */
  list?: { className?: string; itemClassName?: string }
  /** A link class, or a function of the choice's state. */
  linkClassName?: string | ((state: ListRouteNavItemState<string>) => string | undefined)
}

/** One case's mount. */
interface MountOptions {
  /** The URL the router starts at. */
  initial: string
  /** The declared choices. */
  selections: Record<string, ListRouteNavItem>
  /** The nav's props. */
  props?: MountProps
  /** Renders the list beside the nav from the nav's exact URL state. */
  children?: (route: ListRouteResult<string, string>) => string
}

/** The document's next macrotask. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** Lets navigation, its listeners and the render that follows it run. */
const flush = async (app: BootedApp): Promise<void> => {
  for (let round = 0; round < 3; round += 1) await tick()
  await app.settle()
  for (let round = 0; round < 3; round += 1) await tick()
}

/**
 * Builds the case's bootstrap root: the nav with the case's props, the page's URL and
 * list page as outputs (the React test's `<output>`s), and a genuinely local panel
 * button.
 *
 * @param options - The case's declared choices, props and children renderer.
 * @returns The page component type.
 */
const pageFor = (options: MountOptions): Type<unknown> => {
  const props = options.props ?? {}
  const withChildren = options.children !== undefined
  const idAttr = props.id === undefined ? '' : ` id="${props.id}"`
  const children = withChildren
    ? '<ng-template #rowsTpl let-route><output data-testid="rows">{{ rowText(route) }}</output></ng-template>'
    : ''
  const template = `${children}<nav mol-list-route-nav${idAttr} [attr.aria-label]="ariaLabel" [selections]="navSelections" [defaultSelection]="defaultSelection" [pageParam]="pageParam" [list]="listMarkup" [linkClassName]="linkClassName"${withChildren ? ' [children]="rowsTpl"' : ''}></nav><output data-testid="url">{{ url() }}</output><output data-testid="page">{{ listRoute.page() }}</output><button type="button" (click)="openDetails()">Local details panel</button><output data-testid="panel">{{ panel() }}</output>`
  return Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-nav-test-page]',
    standalone: true,
    imports: [ListRouteNav],
    template,
  })(
    class ListRouteNavTestPage {
      private readonly router = useMoleculeRouter()
      private readonly location = signal(this.router.getLocation())
      private readonly stop = this.router.subscribe(() =>
        this.location.set(this.router.getLocation()),
      )
      readonly navSelections = options.selections
      readonly ariaLabel = props['aria-label'] ?? 'Library views'
      readonly defaultSelection = props.defaultSelection
      readonly pageParam = props.pageParam
      readonly listMarkup = props.list
      readonly linkClassName = props.linkClassName
      readonly panel = signal('preview')
      readonly listRoute = useListRoute<string, string>({
        selections: options.selections,
        pageParam: props.pageParam,
      })
      readonly url: Signal<string> = computed(() => {
        const current = this.location()
        return current.pathname + current.search + current.hash
      })
      readonly rowText = (route: ListRouteResult<string, string>): string =>
        options.children?.(route) ?? ''

      constructor() {
        inject(DestroyRef).onDestroy(this.stop)
      }

      /** Flips the local panel's value without touching the URL. */
      openDetails(): void {
        this.panel.set('details')
      }
    },
  )
}

/** The applications this file booted, torn down after each case. */
const apps: BootedApp[] = []

afterEach(() => {
  while (apps.length > 0) apps.pop()?.teardown()
})

/**
 * Boots the case's page over a real Angular Router at `options.initial`.
 *
 * @param options - The case's mount.
 * @returns The booted application.
 */
const mount = async (options: MountOptions): Promise<BootedApp> => {
  const app = await bootApp({
    routes,
    initialPath: options.initial,
    root: pageFor(options),
  })
  apps.push(app)
  await flush(app)
  return app
}

/** Reads a mounted page's URL or list page. */
const read = (app: BootedApp, name: string): string | null =>
  app.host.querySelector(`[data-testid="${name}"]`)?.textContent ?? null

/** Finds a choice by its app-owned selection key. */
const choice = (app: BootedApp, selection: string): HTMLElement => {
  const node = app.host.querySelector<HTMLElement>(`[data-mol-id="list-route-${selection}"]`)
  expect(node, `declared choice ${selection} must remain rendered`).not.toBeNull()
  return node!
}

/** Clicks a choice and lets the navigation and its render finish. */
const click = async (app: BootedApp, selection: string): Promise<void> => {
  choice(app, selection).click()
  await flush(app)
}

const library = {
  all: { path: '/library', label: 'All books' },
  shelf: { path: '/shelves/:shelf', label: 'This shelf', params: { shelf: 'reference' } },
} satisfies Record<string, ListRouteNavItem>

/**
 * A page whose first choice's label is a template (React's icon label): the nav renders it
 * inside the choice's own anchor.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[mol-nav-template-page]',
  standalone: true,
  imports: [ListRouteNav],
  template:
    '<ng-template #iconTpl><svg data-testid="icon"></svg></ng-template><nav mol-list-route-nav aria-label="Library views" [selections]="selections"></nav>',
})
class TemplateLabelPage implements OnInit {
  /** The label template, resolved before the first render. */
  @ViewChild('iconTpl', { static: true }) iconTpl!: TemplateRef<unknown>
  /** The declared choices, the first one labelled by {@link iconTpl}. */
  selections: Record<string, ListRouteNavItem> = {}

  /** Declares the choices with the resolved template. */
  ngOnInit(): void {
    this.selections = {
      all: { path: '/library', label: this.iconTpl },
      shelf: library.shelf,
    }
  }
}

describe('ListRouteNav URL-selected navigation', () => {
  it('uses the same literal route to select the active link and the rendered list', async () => {
    const selections = {
      open: { path: '/members/:member', label: 'Open work' },
      saved: { path: '/members/:member/saved', label: 'Saved work' },
    }
    const rows: Record<string, string> = { open: 'Draft contract', saved: 'Signed contract' }
    const app = await mount({
      initial: '/members/morgan/saved',
      selections,
      children: ({ selection }) => (selection === undefined ? '' : (rows[selection] ?? '')),
    })
    expect(read(app, 'rows')).toBe('Signed contract')
    expect(choice(app, 'saved').getAttribute('aria-current')).toBe('page')
    await click(app, 'open')
    expect(read(app, 'rows')).toBe('Draft contract')
    expect(choice(app, 'open').getAttribute('aria-current')).toBe('page')
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
    const app = await mount({
      initial: '/library',
      selections,
      children: ({ selection }) => (selection === undefined ? '' : (rows[selection] ?? '')),
    })
    const history = choice(app, 'history')
    await click(app, 'history')
    expect(read(app, 'rows')).toBe('Loading history')
    expect(choice(app, 'history')).toBe(history)
    expect(choice(app, 'history').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'fiction').getAttribute('href')).toBe('/library/fiction')
  })

  it('keeps list markup while a named destination resets the page and leaves its source path', async () => {
    const app = await mount({
      initial: '/shelves/reference?page=2&sort=title',
      selections: library,
      props: {
        list: { className: 'library-menu', itemClassName: 'library-menu-item' },
        linkClassName: ({ active }) => (active ? 'selected' : 'choice'),
      },
    })
    const all = choice(app, 'all')
    expect(all.closest('nav > ul.library-menu > li.library-menu-item')).not.toBeNull()
    expect(choice(app, 'shelf').getAttribute('aria-current')).toBe('page')
    expect(all.getAttribute('href')).toBe('/library?sort=title')
    await click(app, 'all')
    expect(read(app, 'url')).toBe('/library?sort=title')
    expect(read(app, 'page')).toBe('1')
    expect(choice(app, 'all').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'all').className).toBe('selected')
  })

  it('keeps a sibling view destination independent of the currently selected view', async () => {
    const memberViews = {
      authored: { path: '/members/:member', label: 'Authored entries' },
      saved: { path: '/members/:member/saved', label: 'Saved entries' },
    } satisfies Record<string, ListRouteNavItem>
    const app = await mount({
      initial: '/members/Ada%20Lovelace?page=3',
      selections: memberViews,
    })
    expect(choice(app, 'authored').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'saved').getAttribute('href')).toBe('/members/Ada%20Lovelace/saved')
    await click(app, 'saved')
    expect(read(app, 'url')).toBe('/members/Ada%20Lovelace/saved')
    expect(read(app, 'page')).toBe('1')
    expect(choice(app, 'saved').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'authored').getAttribute('href')).toBe('/members/Ada%20Lovelace')
    await click(app, 'authored')
    expect(read(app, 'url')).toBe('/members/Ada%20Lovelace')
    expect(choice(app, 'authored').getAttribute('aria-current')).toBe('page')
  })

  it('keeps every declared choice visible on a parameterized route', async () => {
    const app = await mount({ initial: '/shelves/reference?page=2', selections: library })
    expect(app.host.querySelectorAll('nav a')).toHaveLength(2)
    expect(choice(app, 'all').textContent).toBe('All books')
    expect(choice(app, 'all').getAttribute('href')).toBe('/library')
    expect(choice(app, 'shelf').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'all').hasAttribute('aria-current')).toBe(false)
  })

  it('navigates to the declared base view from a parameterized view and resets the page', async () => {
    const app = await mount({ initial: '/shelves/reference?page=2', selections: library })
    await click(app, 'all')
    expect(read(app, 'url')).toBe('/library')
    expect(read(app, 'page')).toBe('1')
    expect(choice(app, 'all').getAttribute('aria-current')).toBe('page')
    expect(app.host.querySelectorAll('nav a')).toHaveLength(2)
  })

  it('derives query-selected views from direct visits and retains unrelated queries and hash', async () => {
    const app = await mount({
      initial: '/orders?view=open&page=3&campaign=mail#rows',
      selections: {
        all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
        open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
      },
    })
    expect(choice(app, 'open').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'all').getAttribute('href')).toBe('/orders?campaign=mail#rows')
    await click(app, 'all')
    expect(read(app, 'url')).toBe('/orders?campaign=mail#rows')
    expect(read(app, 'page')).toBe('1')
    expect(choice(app, 'all').getAttribute('aria-current')).toBe('page')
  })

  it('restores the URL-selected choice and page on Back and Forward', async () => {
    const app = await mount({ initial: '/shelves/reference?page=2', selections: library })
    await click(app, 'all')
    await historyMove(app, -1)
    await flush(app)
    expect(read(app, 'url')).toBe('/shelves/reference?page=2')
    expect(read(app, 'page')).toBe('2')
    expect(choice(app, 'shelf').getAttribute('aria-current')).toBe('page')
    await historyMove(app, 1)
    await flush(app)
    expect(read(app, 'url')).toBe('/library')
    expect(choice(app, 'all').getAttribute('aria-current')).toBe('page')
  })

  it('uses each destination parameter and a custom pagination key', async () => {
    const app = await mount({
      initial: '/shelves/history?cursorPage=4',
      selections: library,
      props: { pageParam: 'cursorPage' },
    })
    expect(choice(app, 'shelf').getAttribute('href')).toBe('/shelves/reference')
    await click(app, 'shelf')
    expect(read(app, 'url')).toBe('/shelves/reference')
    expect(read(app, 'page')).toBe('1')
  })

  it('distinguishes choices sharing a path pattern with different destination parameters', async () => {
    const app = await mount({
      initial: '/shelves/history?page=2',
      selections: {
        reference: { path: '/shelves/:shelf', params: { shelf: 'reference' }, label: 'Reference' },
        history: { path: '/shelves/:shelf', params: { shelf: 'history' }, label: 'History' },
      },
    })
    expect(choice(app, 'history').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'reference').hasAttribute('aria-current')).toBe(false)
    await click(app, 'reference')
    expect(read(app, 'url')).toBe('/shelves/reference')
    expect(choice(app, 'reference').getAttribute('aria-current')).toBe('page')
    expect(choice(app, 'history').hasAttribute('aria-current')).toBe(false)
  })

  it('keeps disabled choices visible without an actionable destination', async () => {
    const app = await mount({
      initial: '/library?page=2',
      selections: { ...library, shelf: { ...library.shelf, disabled: true } },
    })
    expect(choice(app, 'shelf').getAttribute('aria-disabled')).toBe('true')
    expect(choice(app, 'shelf').hasAttribute('href')).toBe(false)
    await click(app, 'shelf')
    expect(read(app, 'url')).toBe('/library?page=2')
  })

  it('passes native nav attributes and URL-derived styling without tab-panel semantics', async () => {
    const app = await mount({
      initial: '/library?page=2',
      selections: library,
      props: {
        'aria-label': 'Book categories',
        id: 'book-views',
        linkClassName: ({ active }) => (active ? 'chosen' : 'available'),
      },
    })
    const nav = app.host.querySelector('nav')!
    expect(nav.id).toBe('book-views')
    expect(nav.getAttribute('aria-label')).toBe('Book categories')
    expect(choice(app, 'all').className).toBe('chosen')
    expect(choice(app, 'shelf').className).toBe('available')
    expect(app.host.querySelector('[role="tablist"]')).toBeNull()
  })

  it('leaves modified link clicks to the browser', async () => {
    const app = await mount({ initial: '/shelves/reference?page=2', selections: library })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    let routerPrevented: boolean | undefined
    // Observe after the component's listener, then cancel jsdom's unsupported navigation.
    document.addEventListener(
      'click',
      (observed) => {
        routerPrevented = observed.defaultPrevented
        observed.preventDefault()
      },
      { once: true },
    )
    choice(app, 'all').dispatchEvent(event)
    await flush(app)
    expect(routerPrevented).toBe(false)
    expect(read(app, 'url')).toBe('/shelves/reference?page=2')
  })

  it('allows a genuinely local panel to change without navigation', async () => {
    const app = await mount({ initial: '/library?page=2', selections: library })
    app.host.querySelector('button')!.click()
    await flush(app)
    expect(read(app, 'panel')).toBe('details')
    expect(read(app, 'url')).toBe('/library?page=2')
    expect(read(app, 'page')).toBe('2')
  })

  it('renders a template label inside its own link', async () => {
    const app = await bootApp({
      routes,
      initialPath: '/library?page=2',
      root: TemplateLabelPage,
    })
    apps.push(app)
    await flush(app)
    expect(choice(app, 'all').querySelector('[data-testid="icon"]')).not.toBeNull()
    expect(choice(app, 'shelf').textContent).toBe('This shelf')
  })
})
