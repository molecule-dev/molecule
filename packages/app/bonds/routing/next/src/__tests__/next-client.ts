/**
 * A minimal stand-in for the Next.js App Router's client, over jsdom's real
 * `window.history`, shaped the way the conformance harness drives it: a React context
 * provider holding the values `usePathname()` / `useSearchParams()` / `useParams()`
 * return, a `useRouter()`-shaped `navigation` object, and a `link()` that pushes the
 * way a `<Link>` click does. The real client cannot run in vitest (it needs a Next
 * server and the compiled App Router bundle), so the test harness mounts this instead
 * and the bond drives it exactly as it would drive Next.
 *
 * Every behaviour below cites the Next.js source it mirrors
 * (`packages/next/src/client/components/app-router.tsx`). What it does NOT mirror:
 * the server round-trip behind `router.push` (Next fetches the RSC payload before the
 * transition commits; the stand-in's transition commits as soon as React renders it),
 * Next's scroll restoration and `prefetch` (a no-op here). Like Next, it
 * dispatches each navigation in a transition and writes the history entry in the
 * commit that shows the new route (`useInsertionEffect`), so the URL never names a
 * page that is not yet on screen.
 *
 * @module
 */

import type { ReactNode } from 'react'
import {
  createContext,
  createElement,
  startTransition,
  useContext,
  useEffect,
  useInsertionEffect,
  useState,
} from 'react'

import type { NextNavigation, NextParams, NextSearchParams } from '../types.js'

/**
 * The history-entry state the App Router writes. Next 16.0.7
 * `packages/next/src/client/components/app-router.tsx` lines 73–80:
 *
 * ```ts
 * const historyState = {
 *   ...(pushRef.preserveCustomHistoryState ? window.history.state : {}),
 *   // __NA is used to identify if the history entry can be handled by the app-router.
 *   // __N is used to identify if the history entry can be handled by the old router.
 *   __NA: true,
 *   __PRIVATE_NEXTJS_INTERNALS_TREE: appHistoryState,
 * }
 * ```
 *
 * written with `history.pushState(historyState, '', canonicalUrl)` (line 89) or
 * `history.replaceState(...)` (line 91); Next 15.5.4 lines 106–114 write the same two
 * keys (`tree` in place of `appHistoryState`). The stand-in's tree payload is a stub —
 * the bond strips these keys from `location().state`, so only their presence matters.
 */
const NEXT_NA_KEY = '__NA'
const NEXT_TREE_KEY = '__PRIVATE_NEXTJS_INTERNALS_TREE'

/** A route pattern the stand-in matches, standing in for the App Router's file routes. */
export interface NextClientRoute {
  /** The pattern: literal segments, `:param` segments (a `[param]` folder in Next), or `*` (a catch-all). */
  path: string
}

/** Options for {@link createNextClient}. */
export interface NextClientOptions {
  /** Where the document starts (a fresh page load of that URL). */
  initialPath?: string

  /** The routes the stand-in matches, for `params`. Defaults to a `*` catch-all. */
  routes?: NextClientRoute[]
  /**
   * `next.config`'s `basePath`: `router.push` writes it before each path (`addBasePath`),
   * `usePathname()` leaves it out (`removeBasePath`), and `<Link>` renders it in the href.
   */
  basePath?: string
}

/** The values the stand-in's hooks return — what the app hands to {@link useMoleculeRouter}. */
export interface NextClientValues {
  /** `useRouter()`'s navigation object. */
  navigation: NextNavigation

  /** `usePathname()`'s pathname. */
  pathname: string

  /** `Object.fromEntries(useSearchParams())`'s value. */
  searchParams: NextSearchParams

  /** `useParams()`'s value. */
  params: NextParams
}

/** One stand-in client: the App Router's client surface a Next app sees. */
export interface NextClient {
  /** Renders `children` with the hook values in context (the root layout's job). */
  Provider(props: { children: ReactNode }): ReactNode

  /** Simulates a `<Link href>` click: Next's Link calls `router.push(href)` (App Router's client-side navigation path). */
  link(path: string): void

  /** `useRouter()`'s navigation object, also handed to the context. */
  navigation: NextNavigation

  /** The native router's own current `pathname + search + hash`, from the document URL, without the basePath. */
  path(): string
  /** The href Next's `<Link href={path}>` renders: `addBasePath(path)`. */
  href(path: string): string

  /** Detaches the client (the page dying; the provider's unmount does the same). */
  destroy(): void
}

/**
 * The App Router state the stand-in keeps, as Next's reducer does: the route the hooks
 * read, the canonical URL to write, and `pushRef` (`app-router.tsx` v16.0.7
 * `HistoryUpdater`, lines 48–80 of the published `dist/client/components/app-router.js`).
 */
interface AppState {
  /** What the location hooks hold. */
  snapshot: Snapshot
  /** The canonical URL (`pathname + search + hash`, basePath included) this state writes. */
  url: string
  /** Next's `pushRef`: push a new entry, and whether the entry's own state is kept. */
  pushRef: { pendingPush: boolean; preserveCustomHistoryState: boolean }
}

/** One committed route: what the stand-in's location hooks hold. */
interface Snapshot {
  /** `usePathname()`. */
  pathname: string
  /** `Object.fromEntries(useSearchParams())`. */
  searchParams: NextSearchParams
  /** `useParams()`. */
  params: NextParams
}

const NextClientContext = createContext<NextClientValues | null>(null)

/**
 * Reads the hook values the way Next's client does after a navigation commits: from the
 * document URL. Next patches `pushState`/`replaceState`/`popstate` to update its router
 * state from the URL (`app-router.tsx` v16.0.7 lines 298–392), and `usePathname()` /
 * `useSearchParams()` read that state.
 *
 * @returns The snapshot.
 */
function readSnapshot(
  routes: NextClientRoute[],
  basePath: string,
  url: URL = new URL(window.location.href),
): Snapshot {
  const pathname = withoutBase(url.pathname, basePath)
  const search = new URLSearchParams(url.search)
  const searchParams: NextSearchParams = {}
  search.forEach((value, key) => {
    const existing = searchParams[key]
    if (existing === undefined) searchParams[key] = value
    else if (Array.isArray(existing)) existing.push(value)
    else searchParams[key] = [existing, value]
  })
  let params: NextParams = {}
  for (const route of routes) {
    const matched = matchPattern(route.path, pathname)
    if (matched) {
      params = matched
      break
    }
  }
  return { pathname, searchParams, params }
}

/**
 * A document pathname without the basePath, as `usePathname()` returns it (`removeBasePath`).
 *
 * @param pathname - The document's pathname.
 * @param basePath - The basePath (`''` for none).
 * @returns The pathname within the app.
 */
function withoutBase(pathname: string, basePath: string): string {
  if (!basePath || (pathname !== basePath && !pathname.startsWith(`${basePath}/`))) return pathname
  return pathname.slice(basePath.length) || '/'
}

/**
 * Matches `pathname` against one pattern: literal segments, `:param` segments (Next's
 * `[param]` folders), or `*` (Next's `[...slug]` catch-all, which leaves no params).
 *
 * @param pattern - The route pattern.
 * @param pathname - The pathname to match.
 * @returns The params, or `null` when the pattern does not match.
 */
function matchPattern(pattern: string, pathname: string): NextParams | null {
  if (pattern === '*') return {}
  const patternSegments = pattern.split('/')
  const pathSegments = pathname.split('/')
  if (patternSegments.length !== pathSegments.length) return null
  const params: NextParams = {}
  for (let i = 0; i < patternSegments.length; i++) {
    const expected = patternSegments[i]
    const actual = pathSegments[i]
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(actual)
    } else if (expected !== decodeURIComponent(actual)) {
      return null
    }
  }
  return params
}

/**
 * Builds a stand-in Next.js App Router client: a fresh history entry for `initialPath`,
 * the context provider, the `navigation` object, and the popstate re-read.
 *
 * @param options - Initial path and routes.
 * @returns The client.
 */
export function createNextClient(options: NextClientOptions = {}): NextClient {
  const routes = options.routes ?? [{ path: '*' }]

  // A fresh document for this client: the harness starts every case at `initialPath`,
  // the way a fresh page load would.
  const basePath = options.basePath ?? ''
  window.history.replaceState(null, '', basePath + (options.initialPath ?? '/'))

  let setState: ((state: AppState) => void) | null = null

  const currentUrl = (): string =>
    window.location.pathname + window.location.search + window.location.hash

  /**
   * Writes the history entry of one committed state, as Next's `HistoryUpdater` does in a
   * `useInsertionEffect` (so the URL changes in the same commit as the page): a push when
   * one is pending and the URL differs, else a replace, with Next's keys and, only when
   * `preserveCustomHistoryState`, the entry's own state (v16.0.7 `app-router.js` 48–80).
   *
   * @param state - The committed state.
   */
  const writeHistory = (state: AppState): void => {
    const historyState = {
      ...(state.pushRef.preserveCustomHistoryState ? window.history.state : {}),
      [NEXT_NA_KEY]: true,
      [NEXT_TREE_KEY]: {
        tree: { stub: true },
        renderedSearch: new URL(state.url, window.location.href).search,
      },
    }
    if (state.pushRef.pendingPush && currentUrl() !== state.url) {
      state.pushRef.pendingPush = false
      window.history.pushState(historyState, '', state.url)
    } else {
      window.history.replaceState(historyState, '', state.url)
    }
  }

  /**
   * Navigates the way `router.push`/`router.replace` do: the new state is dispatched in a
   * transition (`app-router-instance.js` v16.0.7 lines 281–290, `startTransition` around
   * `dispatchNavigateAction`), and its history entry is written when it commits.
   *
   * @param path - The target path.
   * @param replace - Replace the current entry instead of pushing.
   */
  const write = (path: string, replace: boolean): void => {
    const url = new URL(basePath + path, window.location.href)
    const next: AppState = {
      snapshot: readSnapshot(routes, basePath, url),
      url: url.pathname + url.search + url.hash,
      pushRef: { pendingPush: !replace, preserveCustomHistoryState: false },
    }
    const set = setState
    if (set) {
      startTransition(() => {
        set(next)
      })
    } else {
      // No mounted App Router to commit through: write the entry at once.
      writeHistory(next)
    }
  }

  const navigation: NextNavigation = {
    // `router.push(href)` — the App Router instance's push (`app-router-instance.ts`):
    // a new history entry once the navigation commits.
    push: (href) => {
      write(href, false)
    },
    replace: (href) => {
      write(href, true)
    },
    back: () => {
      window.history.back()
    },
    forward: () => {
      window.history.forward()
    },
    // `router.refresh()` re-fetches the route and commits a new state at the same URL with
    // `preserveCustomHistoryState: false` (`refresh-reducer.js` v16.0.7 line 28), so the
    // entry is rewritten in place without its own state.
    refresh: () => {
      const set = setState
      if (!set) return
      const url = new URL(window.location.href)
      startTransition(() => {
        set({
          snapshot: readSnapshot(routes, basePath, url),
          url: currentUrl(),
          pushRef: { pendingPush: false, preserveCustomHistoryState: false },
        })
      })
    },
    prefetch: () => {
      // Next caches the target route; nothing observable in the stand-in.
    },
  }

  const link = (path: string): void => {
    // Next's `<Link>` click navigates through `router.push(href)`.
    write(path, false)
  }

  const path = (): string =>
    withoutBase(window.location.pathname, basePath) + window.location.search + window.location.hash

  /**
   * The provider holding the location state — the root layout's `<Bridge>` stand-in.
   * It registers the state setter and follows `popstate`, which Next's client listens
   * to for back/forward and re-reads the URL from
   * (`app-router.tsx` v16.0.7 lines 372–395: `onPopState` dispatches the traverse; the
   * browser already moved the entry, so no history write happens).
   *
   * @param props - The children.
   * @returns The provider element.
   */
  function Provider({ children }: { children: ReactNode }): ReactNode {
    const [state, update] = useState<AppState>(() => ({
      snapshot: readSnapshot(routes, basePath),
      url: currentUrl(),
      // The initial state keeps whatever the entry already holds (Next's initial pushRef).
      pushRef: { pendingPush: false, preserveCustomHistoryState: true },
    }))
    const { snapshot } = state
    useInsertionEffect(() => {
      writeHistory(state)
    }, [state])
    useEffect(() => {
      setState = update
      // A Back/Forward restores the entry's own route (ACTION_RESTORE), keeping its state.
      const onPop = (): void => {
        update({
          snapshot: readSnapshot(routes, basePath),
          url: currentUrl(),
          pushRef: { pendingPush: false, preserveCustomHistoryState: true },
        })
      }
      window.addEventListener('popstate', onPop)
      return () => {
        window.removeEventListener('popstate', onPop)
        setState = null
      }
    }, [])
    const values: NextClientValues = { navigation, ...snapshot }
    // `createElement`, not JSX: this package's tsconfig sets no `jsx` option (its shipped
    // sources are plain `.ts`), so the tests type-check as plain `.ts` too.
    return createElement(NextClientContext.Provider, { value: values }, children)
  }

  return {
    Provider,
    link,
    navigation,
    path,
    href: (target) => basePath + target,
    destroy(): void {
      setState = null
    },
  }
}

/**
 * Reads the stand-in's hook values inside a rendered component — the stand-in's
 * `usePathname()`/`useSearchParams()`/`useParams()`/`useRouter()` bundle.
 *
 * @returns The hook values.
 * @throws {Error} When used outside the client's provider — Next's hooks throw the
 *   same way outside an App Router render (`invariant(false, ...)` in the Next client).
 */
export function useNextClient(): NextClientValues {
  const values = useContext(NextClientContext)
  if (!values) {
    throw new Error('useNextClient must be used inside the Next client Provider')
  }
  return values
}
