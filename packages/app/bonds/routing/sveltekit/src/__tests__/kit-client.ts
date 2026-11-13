/**
 * A minimal stand-in for SvelteKit 2's client router that behaves the way
 * `@sveltejs/kit` 2.63's client router does in a browser, over jsdom's real
 * `window.history`. The conformance suite needs a native router, and kit's real client
 * cannot run in vitest (it needs kit's virtual modules and a server manifest), so the
 * test harness mounts this instead and the bond drives it exactly as it would drive kit.
 *
 * Every behaviour below cites the `@sveltejs/kit` 2.63 source it mirrors
 * (`node_modules/@sveltejs/kit/src/runtime/client/…`). What it does NOT mirror: kit's
 * server round-trips (`load` functions, data fetching), its scroll/snapshot storage
 * (`constants.js:1-2`, kept in module storage, not in `page.state`), its preload queue,
 * its shallow-popstate shortcut for hash-only changes (`client.js:2825-2844` — every
 * stand-in navigation carries a fresh `sveltekit:history` counter), and kit's route-id
 * syntax — the stand-in matches the patterns the harness declares (`/users/:id`,
 * `*` catch-all) where kit matches the server manifest's `/users/[id]` and `[...rest]`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  KitAfterNavigate,
  KitGotoOptions,
  KitNavigateListener,
  KitNavigationTarget,
  KitNavigationType,
  KitPage,
  KitPageState,
} from '../types.js'

/**
 * kit's own history-entry keys (`@sveltejs/kit` `src/runtime/client/constants.js:1-7`):
 * `sveltekit:snapshot`, `sveltekit:scroll`, `sveltekit:states`, `sveltekit:pageurl`,
 * `sveltekit:history`, `sveltekit:navigation`. The stand-in writes the three a
 * navigation commit writes (`client.js:1827-1831`): the two counters and the app state.
 */
const STATES_KEY = 'sveltekit:states'
const PAGE_URL_KEY = 'sveltekit:pageurl'
const HISTORY_INDEX = 'sveltekit:history'
const NAVIGATION_INDEX = 'sveltekit:navigation'

/** A route pattern the stand-in matches: literal segments, `:param`/`[param]`, or `*` (catch-all). */
export interface KitClientRoute {
  /** The pattern (`/users/:id`, `/settings/*`). */
  path: string
}

/** Options for {@link createKitClient}. */
export interface KitClientOptions {
  /** Where the client starts (kit starts wherever the document was served). */
  initialPath?: string

  /**
   * The routes the stand-in matches, standing in for the manifest kit builds from
   * `src/routes` (`client.js:348`: `routes = __SVELTEKIT_CLIENT_ROUTING__ ? parse(_app) : []`).
   * Defaults to a `*` catch-all.
   */
  routes?: KitClientRoute[]
}

/** One stand-in client: kit's `$app/navigation` exports and `page` store, shaped for the bond. */
export interface KitClient {
  /** kit's `goto` (`client.js:2269`, through `_goto` → `navigate({ type: 'goto', … })`, `client.js:523-544`). */
  goto(url: string, opts?: KitGotoOptions): Promise<void>

  /**
   * kit's `replaceState` (shallow routing, `client.js` `replaceState`): rewrites the
   * current entry with kit's counters, the page url and the new `page.state`, then
   * publishes the page. It fires no `afterNavigate`.
   */
  replaceState(url: string, state: KitPageState): void

  /** Simulates a link click (`client.js:2740-2759`: repaint wait, then `navigate({ type: 'link', … })`). */
  link(path: string): Promise<void>

  /** kit's `page` store (`$app/stores`' `page`, updated via `stores.page.set(clone_page(page))`, `client.js:2922-2926`). */
  page: Readable<KitPage>

  /**
   * kit's `afterNavigate`: adds a callback to `after_navigate_callbacks` (fired at `client.js:1987-1989`).
   * Like kit's, it returns nothing, so a registered callback is never removed while the app lives.
   */
  afterNavigate(callback: KitNavigateListener): void

  /** How many callbacks `afterNavigate` has registered. */
  callbackCount(): number

  /** The client's own current `pathname + search + hash`, read from its `page` url. */
  path(): string

  /** Removes the popstate listener and the callbacks (the app dying with the page). */
  destroy(): void
}

/** A matched route: the pattern that matched (kit's route id) and its params. */
interface RouteMatch {
  /** The pattern, as kit's `route.id` reports it. */
  pattern: string
  /** The segment params. */
  params: Record<string, string>
}

/**
 * Matches `pathname` against one pattern: literal segments, `:param`/`[param]` segments
 * (both spellings accepted; kit's manifest uses `[param]`), or `*` (catch-all).
 *
 * @param pattern - The route pattern.
 * @param pathname - The pathname to match.
 * @returns The match, or `null`.
 */
const matchPattern = (pattern: string, pathname: string): RouteMatch | null => {
  if (pattern === '*') return { pattern, params: {} }
  const patternSegments = pattern.split('/')
  const pathSegments = pathname.split('/')
  if (patternSegments.length !== pathSegments.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternSegments.length; i++) {
    const expected = patternSegments[i]
    const actual = pathSegments[i]
    if (expected.startsWith(':') || (expected.startsWith('[') && expected.endsWith(']'))) {
      params[expected.slice(1).replace(/\]$/, '')] = actual
    } else if (expected !== decodeURIComponent(actual)) {
      return null
    }
  }
  return { pattern, params }
}

/**
 * Reads one of kit's counters or the state out of a history entry, as `unknown` —
 * `history.state` is loosely typed and kit itself guards every read
 * (`client.js:2812-2823`).
 *
 * @param entry - The history entry (`history.state` / `event.state`).
 * @param key - The kit key to read.
 * @returns The value, or `undefined`.
 */
const entryValue = (entry: unknown, key: string): unknown => {
  if (entry === null || typeof entry !== 'object') return undefined
  return (entry as Record<string, unknown>)[key]
}

/**
 * Reads the app state out of a history entry — `client.js:2821`:
 * `const state = event.state[STATES_KEY] ?? {}`.
 *
 * @param entry - The history entry.
 * @returns The `page.state` value (`{}` when the entry carries none).
 */
const entryState = (entry: unknown): KitPageState => {
  const state = entryValue(entry, STATES_KEY)
  return typeof state === 'object' && state !== null ? (state as KitPageState) : {}
}

/**
 * Builds a stand-in SvelteKit client: a fresh jsdom history entry for `initialPath`, the
 * hydration `replaceState` kit does on start, a `popstate` listener, and the `page`
 * store. The bond then drives it through {@link SvelteKitNavigation} like a real kit app.
 *
 * @param options - Initial path and routes.
 * @returns The client.
 */
export const createKitClient = (options: KitClientOptions = {}): KitClient => {
  const routes = options.routes ?? [{ path: '*' }]

  const matchRoute = (pathname: string): RouteMatch | null => {
    for (const route of routes) {
      const matched = matchPattern(route.path, pathname)
      if (matched) return matched
    }
    return null
  }

  // A fresh document for this client: the harness starts every case at `initialPath`,
  // the way a fresh page load would.
  window.history.replaceState(null, '', options.initialPath ?? '/')

  // Start-up: read the entry counters from history.state and, when absent (first load),
  // mint them from Date.now() and write them with replaceState — `client.js:359-376`:
  // `current_history_index = history.state?.[HISTORY_INDEX]` … "we use Date.now() as an
  // offset so that cross-document navigations within the app don't result in data loss"
  // … `history.replaceState({ ...history.state, [HISTORY_INDEX], [NAVIGATION_INDEX] })`.
  // kit's own start reads are falsy-guarded (`client.js:362`), so a missing counter
  // reads as `0` here and mints the Date.now() offset below.
  let currentHistoryIndex: number = readIndexAtStart(HISTORY_INDEX) ?? 0
  let currentNavigationIndex: number = readIndexAtStart(NAVIGATION_INDEX) ?? 0
  if (!currentHistoryIndex) {
    currentHistoryIndex = currentNavigationIndex = Date.now()
    window.history.replaceState(
      {
        ...readStateObject(),
        [HISTORY_INDEX]: currentHistoryIndex,
        [NAVIGATION_INDEX]: currentNavigationIndex,
      },
      '',
    )
  }

  // The current page: url from the document, params from the matched route, state from
  // the entry (`page.state`, `client.js:1852`; `clone_page`, `client.js:3325-3336`).
  const buildPage = (url: URL): KitPage => ({
    url,
    params: matchRoute(url.pathname)?.params ?? {},
    state: entryState(window.history.state),
  })

  let current = buildPage(new URL(window.location.href))
  const pageStore = writable<KitPage>(current)
  const callbacks = new Set<KitNavigateListener>()

  const previousTarget = (): KitNavigationTarget => ({
    params: { ...current.params },
    route: { id: matchRoute(current.url.pathname)?.pattern ?? null },
    url: current.url,
  })

  /**
   * Commits a navigation: update the page, publish a clone to the store, then fire the
   * callbacks. Mirrors kit's order — the history write first (done by the callers),
   * then `page.state`/`page.url` (`client.js:1852`, `2923`), then
   * `stores.page.set(clone_page(page))` (`client.js:2922-2926`), then
   * `after_navigate_callbacks` (`client.js:1987-1989`).
   */
  const commitPage = (
    type: Exclude<KitNavigationType, 'leave'>,
    url: URL,
    from: KitNavigationTarget,
  ): void => {
    const matched = matchRoute(url.pathname)
    current = {
      url,
      params: matched?.params ?? {},
      state: entryState(window.history.state),
    }
    pageStore.set({ ...current })
    const to: KitNavigationTarget = {
      params: { ...current.params },
      route: { id: matched?.pattern ?? null },
      url,
    }
    const navigation: KitAfterNavigate = { type, from, to }
    for (const callback of [...callbacks]) callback(navigation)
  }

  /**
   * Navigates: a new entry (or a replacement) carrying kit's own keys, then the page
   * commit — `client.js:1823-1839`: `const change = replace_state ? 0 : 1; const entry =
   * { [HISTORY_INDEX]: (current_history_index += change), [NAVIGATION_INDEX]:
   * (current_navigation_index += change), [STATES_KEY]: state }; const fn = replace_state
   * ? history.replaceState : history.pushState; fn.call(history, entry, '', url)`.
   */
  const navigate = (
    type: Exclude<KitNavigationType, 'leave'>,
    url: URL,
    navOptions: { replaceState?: boolean; state?: KitPageState },
  ): void => {
    const from = previousTarget()
    const change = navOptions.replaceState ? 0 : 1
    currentHistoryIndex += change
    currentNavigationIndex += change
    const entry = {
      [HISTORY_INDEX]: currentHistoryIndex,
      [NAVIGATION_INDEX]: currentNavigationIndex,
      [STATES_KEY]: navOptions.state ?? {},
    }
    const write = navOptions.replaceState ? window.history.replaceState : window.history.pushState
    write.call(window.history, entry, '', url)
    commitPage(type, url, from)
  }

  const goto = (url: string, opts: KitGotoOptions = {}): Promise<void> => {
    const target = new URL(url, window.location.href)
    // `client.js:2276-2278`: a cross-origin target is not kit's to navigate.
    if (target.origin !== window.location.origin) {
      return Promise.reject(new Error(`Cannot navigate to a different origin: ${target.origin}`))
    }
    navigate('goto', target, opts)
    return Promise.resolve()
  }

  const replaceState = (url: string, state: KitPageState): void => {
    const target = new URL(url || window.location.href, window.location.href)
    window.history.replaceState(
      {
        [HISTORY_INDEX]: currentHistoryIndex,
        [NAVIGATION_INDEX]: currentNavigationIndex,
        [PAGE_URL_KEY]: current.url.href,
        [STATES_KEY]: state,
      },
      '',
      target,
    )
    current = { ...current, state }
    pageStore.set({ ...current })
  }

  const link = async (path: string): Promise<void> => {
    // `client.js:2742-2750`: "allow the browser to repaint before navigating" — one
    // macrotask stands in for the repaint wait (a `setTimeout` fallback there too).
    await new Promise<void>((fulfil) => {
      setTimeout(fulfil, 0)
    })
    const target = new URL(path, window.location.href)
    // `client.js:2757`: `replace_state: options.replace_state ?? url.href === location.href`.
    const replaceState = target.href === window.location.href
    navigate('link', target, { replaceState })
  }

  // Back/forward: kit follows popstate itself — `client.js:2809-2881`. It guards on
  // `event.state?.[HISTORY_INDEX]` (2812), reads `event.state[STATES_KEY] ?? {}` (2821)
  // and `event.state[PAGE_URL_KEY] ?? location.href` (2822 — the commit write carries no
  // PAGE_URL_KEY, so the document URL IS the entry's url), adopts the entry's counters in
  // its `accept` (2856-2859) and navigates with `type: 'popstate'` (2848-2865) — writing
  // NO new history entry, because the browser already moved (the popped path, `client.js:1823`).
  const onPop = (event: PopStateEvent): void => {
    const raw: unknown = event.state
    if (raw === null || typeof raw !== 'object') return
    const entry: Record<string, unknown> = raw as Record<string, unknown>
    if (!entry[HISTORY_INDEX]) return
    const from = previousTarget()
    currentHistoryIndex = Number(entry[HISTORY_INDEX])
    currentNavigationIndex = Number(entry[NAVIGATION_INDEX] ?? currentNavigationIndex)
    const url = new URL(String(entry[PAGE_URL_KEY] ?? window.location.href))
    commitPage('popstate', url, from)
  }
  window.addEventListener('popstate', onPop)

  return {
    goto,
    replaceState,
    link,
    page: pageStore,
    afterNavigate(callback: KitNavigateListener): void {
      callbacks.add(callback)
    },
    callbackCount: () => callbacks.size,
    path: () => {
      const { url } = current
      return url.pathname + url.search + url.hash
    },
    destroy(): void {
      window.removeEventListener('popstate', onPop)
      callbacks.clear()
    },
  }
}

/** Reads one of kit's counters from `history.state` during start-up (`client.js:359-360`). */
function readIndexAtStart(key: string): number | undefined {
  const value = entryValue(window.history.state, key)
  return typeof value === 'number' ? value : undefined
}

/** Reads the current entry's own keys, kept through kit's hydration write (`client.js:370`: `...history.state`). */
function readStateObject(): Record<string, unknown> {
  const state: unknown = window.history.state
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {}
}
