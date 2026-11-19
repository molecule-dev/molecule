/**
 * The Next.js App Router's history as a {@link RouterHistory} for
 * {@link createHistoryRouter} — the only part of the `Router` a Next app must supply,
 * since the core builds every query helper, guard, named route and match.
 *
 * Next's client surface is the values of its own hooks (`useRouter()`, `usePathname()`,
 * `useSearchParams()`, `useParams()`), so the history reads them through a getter: the
 * React hook re-reads a ref that every render refreshes, and the standalone
 * `createNextRouter` reads its config snapshot. Location parts Next's hooks do not
 * expose (the hash, the history state) come from `window`.
 *
 * @module
 */

import type {
  NavigationAction,
  RouteLocation,
  RouteParams,
  RouterHistory,
} from '@molecule/app-routing'

import type { NextParams, NextRouterConfig, NextSearchParams } from './types.js'

/** Options for {@link createNextHistory}. */
export interface NextHistoryOptions {
  /**
   * Notify listeners right after a `push`/`replace` this history performed itself.
   * `true` for the standalone `createNextRouter`, whose snapshot location never
   * re-renders; `false` (the default) for the React hook, which notifies through
   * {@link NextHistory.notifyAfterCommit} once Next has committed and re-rendered.
   */
  notifyOnNativeNavigation?: boolean
}

/**
 * The live history the React hook drives, adding what the hook's render cycle needs to
 * a plain {@link RouterHistory}.
 */
export interface NextHistory extends RouterHistory {
  /**
   * The identity of the current history entry — the `key` of `location()`. It is
   * written into the entry once Next has written it, so a back/forward move onto an old
   * entry returns the key that entry had; an entry someone else wrote gets a fresh key when
   * it is first read, and one without any state (before Next's first write) this history's
   * counter.
   *
   * @returns The entry key.
   */
  entryKey(): string

  /**
   * The location identity of the current render: `pathname + search + hash`. It changes
   * on every navigation Next commits however it started — a `<Link>` click updates the
   * location hooks without this history seeing the write — so the hook keys its
   * notification effect on it.
   *
   * @returns The `pathname`, `search` and `hash` the current location reports.
   */
  pathKey(): string

  /**
   * Brings the current history entry's key and state up to date (see
   * {@link createNextHistory}). Every read does it first; the hook also calls it after each
   * commit, so an entry Next rewrote in place gets its key and state back before the
   * user leaves it.
   */
  syncEntry(): void
  /**
   * Records that a `popstate` event arrived, so the next
   * {@link NextHistory.notifyAfterCommit} reports the move as a `'pop'`. The hook
   * calls it from its own `popstate` listener; the back/forward URL is already current
   * on `window`, while the hook values still show the previous route until React
   * re-renders.
   */
  markPop(): void

  /**
   * Notifies the subscribers once per committed navigation. The hook calls it from an
   * effect that re-runs only when {@link NextHistory.pathKey} changed — i.e. after the
   * native router has committed and the hook values are current. The first call (the
   * initial mount) is skipped: the first render is not a navigation.
   */
  notifyAfterCommit(): void
}

/**
 * The keys the Next.js App Router owns inside `window.history` entries, kept out of
 * `location().state` (the app's state is read from {@link MOLECULE_STATE_KEY} alone, so
 * Next's keys never reach it).
 *
 * `__NA` marks an entry the App Router can handle and `__PRIVATE_NEXTJS_INTERNALS_TREE`
 * carries its internal route tree — Next 16.0.7 `packages/next/src/client/components/app-router.tsx`
 * lines 73–80:
 *
 * ```ts
 * const historyState = {
 *   ...(pushRef.preserveCustomHistoryState ? window.history.state : {}),
 *   // Identifier is shortened intentionally.
 *   // __NA is used to identify if the history entry can be handled by the app-router.
 *   // __N is used to identify if the history entry can be handled by the old router.
 *   __NA: true,
 *   __PRIVATE_NEXTJS_INTERNALS_TREE: appHistoryState,
 * }
 * ```
 *
 * and Next 15.5.4 (same file) lines 106–114 write the same two keys. Next's patched
 * `pushState`/`replaceState` copy exactly these keys onto entries written outside Next
 * (`copyNextJsInternalHistoryState`, v16.0.7 lines 119–133 / v15.5.4 lines 155–169). `__N`/`_N`
 * (lines 77, 332, 356) is the pages router's marker — this bond targets the App Router,
 * and an App Router pop onto a pages entry reloads the page (v16.0.7 lines 379–381), but
 * a hybrid app can still hand us such an entry.
 */
const MOLECULE_STATE_KEY = '__moleculeState'

/**
 * The key this history writes into each entry it commits, naming it — the same
 * arrangement as React Router's `idx`/`key` in `history.state`. Next's `push`/`replace`
 * take no app state, so the entry write happens through this merge; on a pop the entry
 * still carries its key, so `location().key` names the entry it had before.
 */
const MOLECULE_KEY_KEY = '__moleculeKey'

/**
 * Reads the state the app passed out of a history entry: this history stores it under
 * {@link MOLECULE_STATE_KEY}, whole — objects, arrays and primitives travel unchanged —
 * beside the keys Next owns (see the comment above). Any state kind stays with its
 * entry, so a pop back onto it restores it verbatim.
 *
 * @param entry - The raw history state (`window.history.state`).
 * @returns The state handed to `push`/`replace` for this entry, or `undefined` when the
 *   entry carries none (Next's own writes never carry the key).
 */
const entryAppState = (entry: unknown): unknown => {
  if (typeof entry !== 'object' || entry === null) return undefined
  return (entry as Record<string, unknown>)[MOLECULE_STATE_KEY]
}

/**
 * Reads the key naming a history entry: the one this history wrote when it committed
 * the entry, so a pop back onto an old entry returns the key it had. Entries written by
 * someone else (the document's first load) carry no key and fall back to this history's
 * own counter, which only changes when a navigation commits.
 *
 * @param entry - The raw history state (`window.history.state`).
 * @param fallback - The counter value to use for an entry without a key.
 * @returns The entry key.
 */
const entryKeyOf = (entry: unknown, fallback: string): string => {
  if (typeof entry === 'object' && entry !== null) {
    const key = (entry as Record<string, unknown>)[MOLECULE_KEY_KEY]
    if (typeof key === 'string') return key
  }
  return fallback
}

/**
 * Builds the search string from Next's `useSearchParams()` value (`?a=1`, or `''`),
 * keeping repeated keys in their order (`?tag=x&tag=y` for `{ tag: ['x', 'y'] }`).
 *
 * @param params - The search params object, or `undefined` (no query).
 * @returns The search string with a leading `?`, or `''`.
 */
const searchStringOf = (params: NextSearchParams | undefined): string => {
  if (!params) return ''
  const entries: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value)
        entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
    } else {
      entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return entries.length ? `?${entries.join('&')}` : ''
}

/**
 * Normalizes Next's `useParams()` value to molecule route params: Next's catch-all
 * params are arrays, and a route path segment is one slash-joined string.
 *
 * @param params - The Next params object, or `undefined`.
 * @returns The route params.
 */
const routeParamsOf = (params: NextParams | undefined): RouteParams => {
  const result: RouteParams = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    result[key] = Array.isArray(value) ? value.join('/') : value
  }
  return result
}

/**
 * The basePath a Next build compiles into its client code: `next.config`'s `basePath`,
 * which webpack and Turbopack both define as `process.env.__NEXT_ROUTER_BASEPATH`
 * (v16.0.7 `build/define-env.js` line 131), and which `next/link`'s `addBasePath` and
 * `removeBasePath` read (`client/add-base-path.js` line 13). The bundler replaces the
 * expression with the value, so it needs no `process` at run time.
 *
 * @returns The compiled basePath, or `undefined` outside a Next build.
 */
const compiledBasePath = (): string | undefined => {
  try {
    return process.env.__NEXT_ROUTER_BASEPATH
  } catch (_error) {
    // No bundler replaced the expression and this runtime has no `process` (a browser
    // bundle built without Next): no basePath was compiled in.
    return undefined
  }
}

/**
 * The basePath links and navigations carry: the config's, else the one Next compiled in.
 *
 * @param config - The current hook values.
 * @returns The basePath, or `''` for none.
 */
const basePathOf = (config: NextRouterConfig): string => config.basePath ?? compiledBasePath() ?? ''

/**
 * The pathname the location reports: the hook value when given, otherwise the document's
 * own pathname (Next's `usePathname()` returns null during a fallback render; the
 * document URL is the committed location).
 *
 * @param config - The current hook values.
 * @returns The pathname.
 */
const pathnameOf = (config: NextRouterConfig): string => {
  if (config.pathname !== undefined) return config.pathname
  if (typeof window === 'undefined') return '/'
  // `usePathname()` leaves the basePath out; so does the document's pathname read here.
  const { pathname } = window.location
  const base = basePathOf(config)
  if (base && (pathname === base || pathname.startsWith(`${base}/`)))
    return pathname.slice(base.length) || '/'
  return pathname
}

/**
 * The raw `window.history.state`, or `undefined` outside the browser / before a
 * `window.history` exists (a partial `window` stand-in in tests).
 *
 * @returns The state, or `undefined`.
 */
const rawHistoryState = (): unknown => {
  if (typeof window === 'undefined' || !window.history) return undefined
  return window.history.state
}

/** The key and state one history entry carries, and the URL it was seen at. */
interface EntryMeta {
  /** The entry's `pathname + search + hash` in the document (basePath included). */
  url: string
  /** The key naming the entry ({@link MOLECULE_KEY_KEY}). */
  key: string
  /** The app's state for the entry ({@link MOLECULE_STATE_KEY}), or `undefined`. */
  state: unknown
}

/** A navigation this history started whose entry Next has not written yet. */
interface PendingEntry extends EntryMeta {
  /** `window.history.state` when the navigation started: Next's write replaces it. */
  before: unknown
}

/**
 * The document's `pathname + search + hash`, or `''` outside the browser.
 *
 * @returns The URL of the current history entry.
 */
const documentUrl = (): string =>
  typeof window === 'undefined'
    ? ''
    : window.location.pathname + window.location.search + window.location.hash

/**
 * Whether there is a History API to name entries with: not outside the browser (SSR), nor
 * on a partial `window` stand-in.
 *
 * @returns `true` when `window.history.replaceState` can be called.
 */
const canWriteEntries = (): boolean =>
  typeof window !== 'undefined' && typeof window.history?.replaceState === 'function'

/**
 * Merges an entry's key and state into the current history entry, keeping the keys Next
 * put there (`__NA`, `__PRIVATE_NEXTJS_INTERNALS_TREE`) so its pops keep working. Only an
 * entry that already holds an object is written: Next ignores a pop onto an entry without
 * state (v16.0.7 `onPopState`), and writing one would make it reload the page instead.
 *
 * @param meta - The key and state to write.
 */
const writeEntry = (meta: EntryMeta): void => {
  const current = rawHistoryState()
  if (typeof current !== 'object' || current === null) return
  const entry: Record<string, unknown> = { ...current, [MOLECULE_KEY_KEY]: meta.key }
  if (meta.state === undefined) delete entry[MOLECULE_STATE_KEY]
  else entry[MOLECULE_STATE_KEY] = meta.state
  window.history.replaceState(entry, '')
}

/**
 * Builds the Next.js App Router's history. One implementation for both callers: the
 * React hook passes a getter over its ref (the location is current at every call) and
 * lets its render cycle notify; `createNextRouter` passes its config snapshot and
 * notifies right after the native call it made.
 *
 * Next's `push`/`replace` take no app state, and Next writes the new history entry only
 * when the navigation commits, with none of the entry's own state
 * (`preserveCustomHistoryState: false` in its navigate, refresh and server-action
 * reducers; v16.0.7 `HistoryUpdater`). So a navigation's key and state wait as a pending
 * entry, and every read of this history first brings the current entry up to date:
 *
 * - a pending navigation whose entry Next has written (`history.state` is a new object at
 *   the target URL) gets its key and state;
 * - an entry Next rewrote in place (`router.refresh()`, a server action, a `<Link>` to the
 *   current URL) gets back the key and state it had;
 * - an entry nobody named (a `<Link>` to another URL, a redirect, app code's
 *   `pushState`) gets a fresh key and no state.
 *
 * @param readConfig - Reads the hook values at the time of the call.
 * @param options - `notifyOnNativeNavigation` for the snapshot caller.
 * @returns The history.
 */
export const createNextHistory = (
  readConfig: () => NextRouterConfig,
  options: NextHistoryOptions = {},
): NextHistory => {
  const listeners = new Set<(action?: NavigationAction) => void>()
  let keyCounter = 0
  let entryKeyValue = '0'
  let popPending = false
  let mounted = false
  let pending: PendingEntry | undefined
  let current: EntryMeta | undefined

  const syncEntry = (): void => {
    if (!canWriteEntries()) return
    const entry = rawHistoryState()
    if (typeof entry !== 'object' || entry === null) return
    // Next has not written the navigation's entry yet.
    if (pending && entry === pending.before) return
    const url = documentUrl()
    const started = pending
    pending = undefined
    if (started && started.url === url) {
      current = { url, key: started.key, state: started.state }
      writeEntry(current)
      return
    }
    const fields = entry as Record<string, unknown>
    const key = fields[MOLECULE_KEY_KEY]
    if (typeof key === 'string') {
      current = { url, key, state: fields[MOLECULE_STATE_KEY] }
      return
    }
    if (!started && current && current.url === url) {
      writeEntry(current)
      return
    }
    current = { url, key: String(++keyCounter), state: undefined }
    writeEntry(current)
  }

  const location = (): RouteLocation => {
    syncEntry()
    const config = readConfig()
    const entry = rawHistoryState()
    return {
      pathname: pathnameOf(config),
      search: searchStringOf(config.searchParams),
      // Next's hooks expose no hash (`usePathname()` is the pathname, `useSearchParams()`
      // the query), so the fragment is read from the document, like the previous bond.
      hash: typeof window !== 'undefined' ? window.location.hash : '',
      state: entryAppState(entry),
      key: entryKeyOf(entry, entryKeyValue),
    }
  }

  const navigate = (path: string, replace: boolean, state?: unknown): void => {
    syncEntry()
    const config = readConfig()
    // The URL Next writes: `router.push` puts the basePath first.
    const url = basePathOf(config) + path
    if (config.navigation) {
      if (canWriteEntries()) {
        const target = new URL(url, window.location.href)
        pending = {
          url: target.pathname + target.search + target.hash,
          key: String(++keyCounter),
          state,
          before: rawHistoryState(),
        }
      }
      if (replace) config.navigation.replace(path)
      else config.navigation.push(path)
    } else if (typeof window !== 'undefined') {
      // No App Router handed to us: a full-page navigation, like the previous bond. The new
      // document starts with an empty history entry, so no key or state can reach it.
      if (replace) window.location.replace(url)
      else window.location.href = url
    }
    if (options.notifyOnNativeNavigation) {
      for (const listener of [...listeners]) listener(replace ? 'replace' : 'push')
    }
  }

  return {
    location,

    params: () => routeParamsOf(readConfig().params),

    push: (path, state) => navigate(path, false, state),

    replace: (path, state) => navigate(path, true, state),

    // Next's router has no `go`: a history move is the browser's own, and Next follows
    // popstate itself (app-router.tsx v16.0.7 lines 372–392). Outside the browser there
    // is no history to move — the previous bond also did nothing, so the noop is safe.
    go: (delta) => {
      if (typeof window === 'undefined') return
      window.history.go(delta)
    },

    listen(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    // Next's `<Link>` renders `addBasePath(href)`.
    createHref: (path) => basePathOf(readConfig()) + path,

    entryKey: () => {
      syncEntry()
      return entryKeyOf(rawHistoryState(), entryKeyValue)
    },

    syncEntry,

    pathKey: () => {
      const { pathname, search, hash } = location()
      return `${pathname}|${search}|${hash}`
    },

    markPop: () => {
      popPending = true
      // A pop onto an entry this history wrote keeps that entry's key; only a foreign
      // entry (no key written) falls back to the counter, which must then change.
      const entry = rawHistoryState()
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as Record<string, unknown>)[MOLECULE_KEY_KEY] !== 'string'
      ) {
        entryKeyValue = String(++keyCounter)
      }
    },

    notifyAfterCommit(): void {
      if (!mounted) {
        // The first render is the initial mount, not a navigation.
        mounted = true
        return
      }
      const action: NavigationAction | undefined = popPending ? 'pop' : undefined
      popPending = false
      for (const listener of [...listeners]) listener(action)
    },

    destroy() {
      listeners.clear()
    },
  }
}

/**
 * Builds the history for the standalone {@link createNextRouter}: the same history as
 * the React hook's, over a frozen config snapshot, notifying right after each native
 * navigation it starts (there is no render cycle to wait for).
 *
 * @param config - The config snapshot.
 * @returns The history.
 */
export const createNextSnapshotHistory = (config: NextRouterConfig): NextHistory =>
  createNextHistory(() => config, { notifyOnNativeNavigation: true })
