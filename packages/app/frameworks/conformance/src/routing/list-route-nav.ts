/**
 * `runListRouteNavConformance(name, mount)`: the DOM every routing bond's `ListRouteNav`
 * renders, compared with what react-router's `ListRouteNav` renders.
 *
 * `ListRouteNav` ships no styles of its own (its classes come from the app), so the same
 * DOM is the same pixels. Each case mounts the bond's `ListRouteNav` over its real native
 * router at a starting URL, then clicks its choices and moves through history the way a
 * person would. After the mount and after every step it records the router's URL, the
 * normalized DOM of the container, whether a click's default was prevented (the browser
 * would otherwise follow the `href` itself), and whether every choice is still the same
 * element (a navigation re-renders the links; it never remounts them).
 *
 * React is the reference: react-router's suite calls this with `{ reference: true }`, and
 * `RECORD_GOLDENS=1` there records `goldens/list-route-nav.json`. Every other bond must
 * reproduce it exactly.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import type { QueryParams, RouteParams } from '@molecule/app-routing'

import { normalizeDom } from '../ui/normalize.js'

/** One declared choice, in React's `ListRouteNavItem` spelling with a text label. */
export interface ListRouteNavCaseItem {
  /** Absolute route pattern, such as `/shelves/:shelf`. */
  path: string
  /** Query values identifying this view; an undefined value requires the key to be absent. */
  query?: QueryParams
  /** The label text. */
  label: string
  /** Path parameters for this destination. */
  params?: RouteParams
  /** Keeps the choice visible but not navigable. */
  disabled?: boolean
}

/** What a choice's link class is computed from (React's `ListRouteNavItemState`). */
export interface ListRouteNavCaseItemState {
  /** The selection key. */
  selection: string
  /** Whether the current URL selects this choice. */
  active: boolean
  /** Whether the choice is disabled. */
  disabled: boolean
}

/** What a case's children function reads from the list route. */
export interface ListRouteNavCaseRoute {
  /** The selected view, or `undefined` when none matches. */
  selection: string | undefined
  /** The current page. */
  page: number
}

/** The props a case renders `ListRouteNav` with, in React's spelling. */
export interface ListRouteNavCaseProps {
  /** The navigation's accessible name. */
  'aria-label': string
  /** The declared choices. */
  selections: Record<string, ListRouteNavCaseItem>
  /** Tie-breaker or fallback selection. */
  defaultSelection?: string
  /** The pagination query key. */
  pageParam?: string
  /** List markup with optional classes. */
  list?: { className?: string; itemClassName?: string }
  /** A link class, or a function of the choice's state. */
  linkClassName?: string | ((state: ListRouteNavCaseItemState) => string | undefined)
  /** Other attributes the `<nav>` carries, such as `id`. */
  attrs?: Record<string, string>
  /**
   * When set, `ListRouteNav`'s children render `<output data-testid="children">` holding
   * this function's text for the current route.
   */
  children?: (route: ListRouteNavCaseRoute) => string
}

/** A mounted `ListRouteNav`. */
export interface MountedListRouteNav {
  /** The native router's current path within the app: pathname, query string and hash. */
  nativePath(): string
  /** Goes back one history entry through the native router (or the browser). */
  nativeBack(): void | Promise<void>
  /** Goes forward one history entry. */
  nativeForward(): void | Promise<void>
  /**
   * Runs `action` (a DOM event, a history move) the way the framework expects outside
   * code to run (React: inside `act`) and resolves once the framework rendered its result.
   */
  perform(action: () => unknown): Promise<void>
  /** Removes the app. */
  unmount(): Promise<void>
}

/**
 * The route patterns a mount declares on its native router, every one rendering the same
 * page: `ListRouteNav` with the case's props and nothing else. `*` is the catch-all (Vue
 * Router's `/:pathMatch(.*)*`, Angular's `**`).
 */
export const listRouteNavRoutes: readonly string[] = [
  '/library/:shelf',
  '/shelves/:shelf',
  '/members/:member',
  '/members/:member/saved',
  '*',
]

/**
 * Renders the bond's `ListRouteNav` with `props` into `container`, over the bond's real
 * native router declaring {@link listRouteNavRoutes}, starting at `initialPath`.
 */
export type ListRouteNavMount = (
  container: HTMLElement,
  initialPath: string,
  props: ListRouteNavCaseProps,
) => Promise<MountedListRouteNav>

/** One step of a case. */
export type ListRouteNavStep =
  | {
      /** Clicks the choice with this selection key. */
      click: string
      /** Holds Ctrl, as for opening a new tab. */
      ctrlKey?: boolean
    }
  | {
      /** Moves through history. */
      history: 'back' | 'forward'
    }

/** One case: a starting URL, the props and the steps. */
export interface ListRouteNavCase {
  /** What the case checks. */
  name: string
  /** The URL the native router starts at. */
  initialPath: string
  /** The props. */
  props: ListRouteNavCaseProps
  /** The steps after the mount. */
  steps: ListRouteNavStep[]
}

/** What the case records after the mount and after each step. */
export interface ListRouteNavRecord {
  /** The step, or `'mount'`. */
  step: string
  /** The native router's path. */
  path: string
  /** The normalized DOM of the container. */
  dom: string
  /** For a click: whether its default was prevented. */
  prevented?: boolean
  /** Whether every choice is the same element as before the step. */
  sameChoices?: boolean
}

/** Recorded results, by case name. */
export type ListRouteNavGoldens = Record<string, ListRouteNavRecord[]>

const library = {
  all: { path: '/library', label: 'All books' },
  shelf: { path: '/shelves/:shelf', label: 'This shelf', params: { shelf: 'reference' } },
} satisfies Record<string, ListRouteNavCaseItem>

const memberViews = {
  authored: { path: '/members/:member', label: 'Authored entries' },
  saved: { path: '/members/:member/saved', label: 'Saved entries' },
} satisfies Record<string, ListRouteNavCaseItem>

const rowsOf =
  (rows: Record<string, string>) =>
  ({ selection }: ListRouteNavCaseRoute): string =>
    selection === undefined ? '' : (rows[selection] ?? '')

/** Every `ListRouteNav` case, from react-router's `list-route-nav.test.tsx`. */
export const listRouteNavCases: ListRouteNavCase[] = [
  {
    name: 'keeps every declared choice visible on a parameterized route and selects the base view',
    initialPath: '/shelves/reference?page=2',
    props: { 'aria-label': 'Library views', selections: library },
    steps: [{ click: 'all' }],
  },
  {
    name: 'keeps list markup and URL-derived link classes across a selection',
    initialPath: '/shelves/reference?page=2&sort=title',
    props: {
      'aria-label': 'Library views',
      selections: library,
      list: { className: 'library-menu', itemClassName: 'library-menu-item' },
      linkClassName: ({ active }) => (active ? 'selected' : 'choice'),
    },
    steps: [{ click: 'all' }],
  },
  {
    name: 'keeps a sibling view destination independent of the selected view',
    initialPath: '/members/Ada%20Lovelace?page=3',
    props: { 'aria-label': 'Library views', selections: memberViews },
    steps: [{ click: 'saved' }, { click: 'authored' }],
  },
  {
    name: 'derives query-selected views and keeps unrelated query values and the hash',
    initialPath: '/orders?view=open&page=3&campaign=mail#rows',
    props: {
      'aria-label': 'Library views',
      selections: {
        all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
        open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
      },
    },
    steps: [{ click: 'all' }],
  },
  {
    name: 'restores the URL-selected choice on Back and Forward',
    initialPath: '/shelves/reference?page=2',
    props: { 'aria-label': 'Library views', selections: library },
    steps: [{ click: 'all' }, { history: 'back' }, { history: 'forward' }],
  },
  {
    name: 'uses each destination parameter and a custom pagination key',
    initialPath: '/shelves/history?cursorPage=4',
    props: { 'aria-label': 'Library views', selections: library, pageParam: 'cursorPage' },
    steps: [{ click: 'shelf' }],
  },
  {
    name: 'distinguishes choices sharing a path pattern with different parameters',
    initialPath: '/shelves/history?page=2',
    props: {
      'aria-label': 'Library views',
      selections: {
        reference: { path: '/shelves/:shelf', params: { shelf: 'reference' }, label: 'Reference' },
        history: { path: '/shelves/:shelf', params: { shelf: 'history' }, label: 'History' },
      },
    },
    steps: [{ click: 'reference' }],
  },
  {
    name: 'keeps a disabled choice visible without a destination',
    initialPath: '/library?page=2',
    props: {
      'aria-label': 'Library views',
      selections: { ...library, shelf: { ...library.shelf, disabled: true } },
    },
    steps: [{ click: 'shelf' }],
  },
  {
    name: 'passes native nav attributes and URL-derived styling',
    initialPath: '/library?page=2',
    props: {
      'aria-label': 'Book categories',
      selections: library,
      attrs: { id: 'book-views' },
      linkClassName: ({ active }) => (active ? 'chosen' : 'available'),
    },
    steps: [],
  },
  {
    name: 'renders the list after the navigation landmark from the same route',
    initialPath: '/members/morgan/saved',
    props: {
      'aria-label': 'Member work',
      selections: {
        open: { path: '/members/:member', label: 'Open work' },
        saved: { path: '/members/:member/saved', label: 'Saved work' },
      },
      children: rowsOf({ open: 'Draft contract', saved: 'Signed contract' }),
    },
    steps: [{ click: 'open' }],
  },
  {
    name: 'decodes a route parameter once, keeping an escaped percent sign literal',
    initialPath: '/members/50%25%20off',
    props: { 'aria-label': 'Library views', selections: memberViews },
    steps: [{ click: 'saved' }],
  },
  {
    name: 'keeps the filter links while the new selection loads its rows',
    initialPath: '/library',
    props: {
      'aria-label': 'Filter books',
      selections: {
        all: { path: '/library', label: 'All books' },
        history: { path: '/library/:shelf', params: { shelf: 'history' }, label: 'History' },
        fiction: { path: '/library/:shelf', params: { shelf: 'fiction' }, label: 'Fiction' },
      },
      children: rowsOf({
        all: 'All books',
        history: 'Loading history',
        fiction: 'Loading fiction',
      }),
    },
    steps: [{ click: 'history' }, { click: 'fiction' }],
  },
  {
    name: 'leaves a modified click to the browser',
    initialPath: '/shelves/reference?page=2',
    props: { 'aria-label': 'Library views', selections: library },
    steps: [{ click: 'all', ctrlKey: true }],
  },
]

// A path string, not `new URL(…)`: under jsdom the global `URL` is jsdom's.
const GOLDENS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'goldens', 'list-route-nav.json')

/**
 * The recorded goldens.
 *
 * @returns The goldens, or an empty record before the first recording.
 */
export const listRouteNavGoldens = (): ListRouteNavGoldens =>
  existsSync(GOLDENS_FILE)
    ? (JSON.parse(readFileSync(GOLDENS_FILE, 'utf8')) as ListRouteNavGoldens)
    : {}

/** Every choice element in the container, by selection key. */
const choicesIn = (container: HTMLElement): Map<string, Element> => {
  const out = new Map<string, Element>()
  for (const element of container.querySelectorAll('[data-mol-id^="list-route-"]')) {
    out.set(element.getAttribute('data-mol-id') ?? '', element)
  }
  return out
}

/**
 * Clicks an element and reports whether its default (the browser following the `href`)
 * was prevented. A window listener reads it after every handler ran, then prevents it,
 * because jsdom cannot leave the page.
 *
 * @param element - The choice.
 * @param ctrlKey - Whether Ctrl is held.
 * @returns Whether a handler prevented the click's default.
 */
const clickAndObserve = (element: Element, ctrlKey: boolean): boolean => {
  const seen: { prevented?: boolean } = {}
  const observe = (event: Event): void => {
    seen.prevented = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', observe)
  try {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey }))
  } finally {
    window.removeEventListener('click', observe)
  }
  if (seen.prevented === undefined) throw new Error('conformance: the choice stopped the click')
  return seen.prevented
}

/**
 * Runs one case and records what it rendered.
 *
 * @param mount - The bond's mount.
 * @param testCase - The case.
 * @returns The records, the mount's first.
 */
export async function recordListRouteNavCase(
  mount: ListRouteNavMount,
  testCase: ListRouteNavCase,
): Promise<ListRouteNavRecord[]> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const mounted = await mount(container, testCase.initialPath, testCase.props)
  try {
    await mounted.perform(() => undefined)
    const records: ListRouteNavRecord[] = [
      { step: 'mount', path: mounted.nativePath(), dom: normalizeDom(container) },
    ]
    for (const step of testCase.steps) {
      const before = choicesIn(container)
      let prevented: boolean | undefined
      let label: string
      if ('click' in step) {
        label = `${step.ctrlKey ? 'ctrl-click' : 'click'} ${step.click}`
        const element = before.get(`list-route-${step.click}`)
        if (!element) throw new Error(`conformance: no choice "${step.click}" is rendered`)
        await mounted.perform(() => {
          prevented = clickAndObserve(element, step.ctrlKey ?? false)
        })
      } else {
        label = step.history
        await mounted.perform(() =>
          step.history === 'back' ? mounted.nativeBack() : mounted.nativeForward(),
        )
      }
      const after = choicesIn(container)
      records.push({
        step: label,
        path: mounted.nativePath(),
        dom: normalizeDom(container),
        ...(prevented === undefined ? {} : { prevented }),
        sameChoices:
          before.size === after.size && [...before].every(([key, el]) => after.get(key) === el),
      })
    }
    return records
  } finally {
    await mounted.unmount()
    container.remove()
  }
}

/** Options for {@link runListRouteNavConformance}. */
export interface ListRouteNavConformanceOptions {
  /**
   * The bond is the reference (react-router): with `RECORD_GOLDENS=1` its results are
   * written as the goldens instead of compared with them.
   */
  reference?: boolean
}

/**
 * Registers one test per {@link listRouteNavCases} case, comparing what the bond's
 * `ListRouteNav` renders with the recorded goldens.
 *
 * @param name - The bond's name, for the describe block.
 * @param mount - Renders the bond's `ListRouteNav` over its native router.
 * @param options - Whether the bond is the reference.
 */
export function runListRouteNavConformance(
  name: string,
  mount: ListRouteNavMount,
  options: ListRouteNavConformanceOptions = {},
): void {
  const record = options.reference === true && process.env.RECORD_GOLDENS === '1'
  const goldens = listRouteNavGoldens()
  const recorded: ListRouteNavGoldens = {}

  describe(`ListRouteNav conformance: ${name}`, () => {
    for (const testCase of listRouteNavCases) {
      it(testCase.name, async () => {
        const records = await recordListRouteNavCase(mount, testCase)
        if (record) {
          recorded[testCase.name] = records
          return
        }
        const golden = goldens[testCase.name]
        if (!golden) {
          throw new Error(
            `framework-conformance: no ListRouteNav golden for "${testCase.name}"; record it: RECORD_GOLDENS=1 npx vitest run src/__tests__/conformance.test.tsx in packages/app/bonds/routing/react-router`,
          )
        }
        expect(records).toEqual(golden)
      })
    }

    if (record) {
      afterAll(() => {
        const missing = listRouteNavCases.filter((c) => !(c.name in recorded))
        if (missing.length > 0) {
          throw new Error(
            `framework-conformance: not recorded (a case failed or was filtered): ${missing.map((c) => c.name).join('; ')}`,
          )
        }
        mkdirSync(dirname(GOLDENS_FILE), { recursive: true })
        writeFileSync(GOLDENS_FILE, `${JSON.stringify(recorded, null, 2)}\n`)
      })
    }
  })
}
