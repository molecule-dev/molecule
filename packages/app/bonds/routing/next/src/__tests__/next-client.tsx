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
 * the server round-trip behind `router.push` (Next fetches the RSC payload and commits
 * later; the stand-in commits synchronously — the conformance suite settles either
 * way), Next's scroll restoration and its `refresh`/`prefetch` (no-ops here).
 *
 * @module
 */

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

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

  /** The native router's own current `pathname + search + hash`, from the document URL. */
  path(): string

  /** Detaches the client (the page dying; the provider's unmount does the same). */
  destroy(): void
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
function readSnapshot(routes: NextClientRoute[]): Snapshot {
  const pathname = window.location.pathname
  const search = new URLSearchParams(window.location.search)
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
  window.history.replaceState(null, '', options.initialPath ?? '/')

  let setState: ((snapshot: Snapshot) => void) | null = null

  /**
   * Commits a navigation the way Next's history updater does — write the entry with
   * Next's keys, then update the router state so the location hooks hold the new URL
   * (`app-router.tsx` v16.0.7 lines 68–92: `historyState = { __NA: true,
   * __PRIVATE_NEXTJS_INTERNALS_TREE: appHistoryState }`, then `pushState`/`replaceState`
   * with the canonical URL).
   *
   * @param path - The target path.
   * @param replace - Replace the current entry instead of pushing.
   */
  const write = (path: string, replace: boolean): void => {
    const url = new URL(path, window.location.href)
    const historyState = {
      [NEXT_NA_KEY]: true,
      [NEXT_TREE_KEY]: { tree: { stub: true }, renderedSearch: url.search },
    }
    const target = url.pathname + url.search + url.hash
    if (replace) window.history.replaceState(historyState, '', target)
    else window.history.pushState(historyState, '', target)
    setState?.(readSnapshot(routes))
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
    refresh: () => {
      // Next re-fetches the current route; no history move, so a no-op here.
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
    window.location.pathname + window.location.search + window.location.hash

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
    const [snapshot, update] = useState<Snapshot>(() => readSnapshot(routes))
    useEffect(() => {
      setState = update
      const onPop = (): void => {
        update(readSnapshot(routes))
      }
      window.addEventListener('popstate', onPop)
      return () => {
        window.removeEventListener('popstate', onPop)
        setState = null
      }
    }, [])
    const values: NextClientValues = { navigation, ...snapshot }
    return <NextClientContext.Provider value={values}>{children}</NextClientContext.Provider>
  }

  return {
    Provider,
    link,
    navigation,
    path,
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
