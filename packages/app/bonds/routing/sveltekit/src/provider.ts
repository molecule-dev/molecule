/**
 * SvelteKit provider implementation for the molecule `Router`.
 *
 * `createSvelteKitRouter` supplies only a {@link RouterHistory} over SvelteKit's client
 * router — location from kit's `page`, navigation through kit's `goto`, history moves
 * through `window.history` (kit follows popstate itself), notifications through the app's
 * `afterNavigate` adapter — and gets the whole `Router` from the core
 * `createHistoryRouter`, exactly like every other routing bond.
 *
 * With HTTP and auth clients bonded, the router replaces the current location with
 * `/login` after a credential-free GET receives a 401 and the session is confirmed signed
 * out, as React's `BrowserRouter` does (`redirectSignedOutRejections` from
 * `@molecule/app-routing`). `location.state.from` holds the original location. Set
 * `signInPath` to use a different sign-in route or `signInPath: false` to opt out.
 *
 * @module
 */

import { get } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'
import type {
  RouteLocation,
  Router,
  RouterHistory,
  SignInRequiredHttpSource,
  SignInRequiredSessionSource,
  SignInRequiredSources,
} from '@molecule/app-routing'
import {
  createBrowserRouter,
  createHistoryRouter,
  DEFAULT_SIGN_IN_PATH,
  fromHistoryStateRecord,
  redirectSignedOutRejections,
  toHistoryStateRecord,
} from '@molecule/app-routing'

import type {
  KitAfterNavigate,
  KitNavigateListener,
  KitPage,
  KitPageState,
  KitUrl,
  SvelteKitExports,
  SvelteKitNavigation,
  SvelteKitRouterOptions,
} from './types.js'

/** The namespace kit owns inside history entries and storage (`sveltekit:snapshot`, `sveltekit:history-info`, `sveltekit:metadata`, … — `@sveltejs/kit` 3.2 `src/runtime/client/constants.js:1-4`). */
const KIT_STATE_PREFIX = 'sveltekit:'

/** The record kit writes into every history entry it commits (`sveltekit:metadata`, `@sveltejs/kit` 3.2 `src/runtime/client/constants.js:4`), whose `historyIndex` is read for the per-entry location key. */
const KIT_HISTORY_METADATA = 'sveltekit:metadata'

/**
 * The kit apps (by their `page`) whose sign-in rule is applied, so a second router over the
 * same kit client does not redirect a second time.
 */
const signInWatched = new WeakSet<object>()

/**
 * The HTTP and auth clients the app bonds, read from the same slots as their accessors
 * without loading the optional packages.
 *
 * @returns Both sources, or `undefined` while either is unbonded.
 */
const bondedSignInSources = (): SignInRequiredSources | undefined => {
  const http = get<SignInRequiredHttpSource>('http-client')
  const session = get<SignInRequiredSessionSource>('auth-client')
  return http && session ? { http, session } : undefined
}

/** The `page.state` key this bond keeps each entry's location key under. */
const ENTRY_KEY = '__moleculeKey'

const newKey = (): string => Math.random().toString(36).slice(2)

/** Whether `key` is one of kit's own (`sveltekit:*`). */
const isKitKey = (key: string): boolean => key.startsWith(KIT_STATE_PREFIX)

/**
 * The `page.state` a navigation through this router writes: any value the browser can
 * store (wrapped by `toHistoryStateRecord` when it is not a plain object, or uses one of
 * kit's keys), plus a new entry key.
 *
 * @param state - The state handed to `navigate`/`push`/`replace`.
 * @returns The `page.state` for kit's `goto`.
 */
const toKitState = (state: unknown): KitPageState => ({
  ...toHistoryStateRecord(state, isKitKey),
  [ENTRY_KEY]: newKey(),
})

/**
 * Reads the app's state out of a `page.state` value: kit's own keys (`sveltekit:*`,
 * `@sveltejs/kit` `src/runtime/client/constants.js:1-7`, which kit already keeps out of
 * `page.state`; stripped as defence) and this bond's entry key are left out.
 *
 * @param state - The `page.state` value.
 * @returns The state the app passed, or `undefined` when there is none (kit's default
 * `page.state` is `{}`).
 */
const locationState = (state: KitPageState): unknown => {
  const entries = Object.entries(state).filter(([key]) => key !== ENTRY_KEY && !isKitKey(key))
  return fromHistoryStateRecord(entries.length > 0 ? Object.fromEntries(entries) : undefined)
}

/**
 * The entry key this bond wrote into a `page.state`.
 *
 * @param state - The `page.state` value.
 * @returns The key, or `undefined` for an entry the bond has not keyed.
 */
const stateKey = (state: KitPageState): string | undefined => {
  const key: unknown = ENTRY_KEY in state ? state[ENTRY_KEY] : undefined
  return typeof key === 'string' ? key : undefined
}

/**
 * The location key of an entry kit committed without this bond's key (a kit link, the
 * first load): the `historyIndex` and `navigationIndex` kit writes into every entry it
 * commits (`sveltekit:metadata`, `@sveltejs/kit` 3.2 `src/runtime/client/client.js:2119-2121`),
 * which together name one entry, so a pop back to a URL visited before still names its own.
 *
 * @returns The entry key, or `undefined` outside the browser (no history) or before kit
 * wrote its first entry.
 */
const entryKey = (): string | undefined => {
  const entry: unknown = typeof window === 'undefined' ? null : window.history.state
  if (entry === null || typeof entry !== 'object' || !(KIT_HISTORY_METADATA in entry)) {
    return undefined
  }
  const metadata: unknown = entry[KIT_HISTORY_METADATA]
  if (
    metadata === null ||
    typeof metadata !== 'object' ||
    !('historyIndex' in metadata) ||
    !('navigationIndex' in metadata)
  ) {
    return undefined
  }
  return `kit-${String(metadata.historyIndex)}-${String(metadata.navigationIndex)}`
}

/** Origin used only to parse an in-app path into its parts. */
const URL_BASE = 'http://localhost'

/**
 * What kit puts before every in-app path: `rootHref` (kit's `resolve('/')`) without its
 * last `/` — `''`, the base (`'/app'`), or `'#'` under hash routing.
 *
 * @param rootHref - Kit's `resolve('/')`.
 * @returns The prefix.
 */
const prefixOf = (rootHref: string): string =>
  rootHref.endsWith('/') ? rootHref.slice(0, -1) : rootHref

/**
 * The in-app location of kit's page URL, the way kit itself reads the route path
 * (`get_url_path`, `@sveltejs/kit` 3.2 `src/runtime/client/client.js:1858-1863`): under
 * hash routing the path is the URL's (decoded) hash, otherwise its pathname after the base.
 *
 * @param url - Kit's `page.url`.
 * @param prefix - The prefix from {@link prefixOf}.
 * @returns The pathname, search and hash within the app.
 */
const inAppParts = (
  url: KitUrl,
  prefix: string,
): { pathname: string; search: string; hash: string } => {
  if (prefix === '#') {
    const inner = new URL(url.hash.slice(1) || '/', URL_BASE)
    return { pathname: inner.pathname, search: inner.search, hash: inner.hash }
  }
  const { pathname } = url
  const inApp =
    prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))
      ? pathname.slice(prefix.length) || '/'
      : pathname
  return { pathname: inApp, search: url.search, hash: url.hash }
}

/**
 * Builds the molecule `Router` over a SvelteKit app's client router.
 *
 * The app passes kit's `goto`, kit's `page`, its root href and an `afterNavigate` adapter (see
 * {@link SvelteKitNavigation.onNavigate} and the package example) once, from the root
 * layout. `MoleculeRouterProvider` builds it there and bonds it with
 * `@molecule/app-routing`'s `setRouter`; a layout that builds it by hand does the same, and
 * may also supply it to `@molecule/app-svelte`'s `setMoleculeContext`.
 *
 * Subscribers hear exactly one call per navigation kit commits — kit links, the back
 * button, and this router's own `navigate` — because kit fires `afterNavigate` only
 * after a navigation completed (`@sveltejs/kit` 3.2 `src/runtime/client/client.js:2289`):
 * a navigation kit's own guards cancelled never reaches `afterNavigate`, so it never
 * notifies. The history holds no resources of its own: the kit subscription is released
 * through the unsubscribe `listen` returns.
 *
 * @param kit - The SvelteKit pieces (see {@link SvelteKitNavigation}).
 * @param options - Route definitions, an optional `onRouterReady` called once with the router,
 *   and the `signInPath` a signed-out GET 401 sends the visitor to (`false` turns it off).
 * @returns The router.
 */
export const createSvelteKitRouter = (
  kit: SvelteKitNavigation,
  options: SvelteKitRouterOptions = {},
): Router => {
  const prefix = prefixOf(kit.rootHref)
  const history: RouterHistory = {
    /** The current location, from kit's `page` at the time of the call. */
    location(): RouteLocation {
      const page: KitPage = kit.page
      return {
        ...inAppParts(page.url, prefix),
        state: locationState(page.state),
        key: stateKey(page.state) ?? entryKey(),
      }
    },

    /** The params of the route kit matched. */
    params: () => ({ ...kit.page.params }),

    // Kit's `goto` takes the URL with the base (or `#`) first. The state survives a reload,
    // as a browser history entry's state does.
    push: (path, state) =>
      kit.goto(prefix + path, { state: toKitState(state), persistState: true }),

    replace: (path, state) =>
      kit.goto(prefix + path, { replace: true, state: toKitState(state), persistState: true }),

    // The href `<a href={resolve(path)}>` carries in a kit app.
    createHref: (path) => prefix + path,

    /** Kit follows popstate itself, so a history move is the browser's own `go`. */
    go: (delta) => {
      if (typeof window === 'undefined') {
        throw new Error(
          t('routing.sveltekit.error.serverHistory', undefined, {
            defaultValue:
              'history moves are only available in the browser: the SvelteKit client router does not run during server-side rendering',
          }),
        )
      }
      window.history.go(delta)
    },

    listen(listener) {
      return kit.onNavigate((navigation: KitAfterNavigate): void => {
        // `'enter'` is the first load/hydration, not a navigation; `'popstate'` is a
        // back/forward move. Kit's `'goto'`/`'link'`/`'form'` carry no molecule action —
        // createHistoryRouter answers with the action it started or `'push'`.
        if (navigation.type === 'enter') return
        listener(navigation.type === 'popstate' ? 'pop' : undefined)
      })
    },
  }

  const router = createHistoryRouter(history, { routes: options.routes })
  const { signInPath = DEFAULT_SIGN_IN_PATH } = options
  const page: object = kit.page
  if (signInPath !== false && !signInWatched.has(page)) {
    signInWatched.add(page)
    const stop = redirectSignedOutRejections(router, {
      signInPath,
      sources: bondedSignInSources,
    })
    const destroy = router.destroy
    router.destroy = (): void => {
      stop()
      signInWatched.delete(page)
      destroy()
    }
  }
  // Called once, at construction: the layout builds the router once, so a later change of the
  // callback (or of anything else the caller holds) never re-invokes it — React's
  // `MoleculeRouterProvider` calls `onRouterReady` once per router for the same reason.
  options.onRouterReady?.(router)
  return router
}

/**
 * Builds the {@link SvelteKitNavigation} that `createSvelteKitRouter` takes, from kit's own
 * exports. Call it during the root layout's component initialisation, where kit allows
 * `afterNavigate`. It registers ONE `afterNavigate` callback and passes each navigation to
 * the listeners the router adds and removes, so stopping and restarting a subscription
 * never leaves a second kit callback behind (a hand-written adapter whose unsubscribe does
 * nothing would notify subscribers twice after that).
 *
 * @param kit - Kit's `goto`, `page`, `afterNavigate` and `resolve('/')`.
 * @returns The navigation pieces for `createSvelteKitRouter`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { afterNavigate, goto } from '$app/navigation'
 *   import { resolve } from '$app/paths'
 *   import { page } from '$app/state'
 *   import { createSvelteKitNavigation, createSvelteKitRouter } from '@molecule/app-routing-sveltekit'
 *
 *   const router = createSvelteKitRouter(
 *     createSvelteKitNavigation({ goto, page, afterNavigate, rootHref: resolve('/') }),
 *   )
 * </script>
 * ```
 */
export const createSvelteKitNavigation = (kit: SvelteKitExports): SvelteKitNavigation => {
  const listeners = new Set<KitNavigateListener>()
  kit.afterNavigate((navigation) => {
    for (const listener of [...listeners]) listener(navigation)
  })
  return {
    goto: kit.goto,
    page: kit.page,
    rootHref: kit.rootHref,
    onNavigate(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * The conventional typed provider constant: the core's browser-history router
 * (`createBrowserRouter`), for molecule code running OUTSIDE a SvelteKit app — tests,
 * stories, or a plain page that mounts molecule components. Inside a SvelteKit app do
 * not use it: it would read `window.location` and push `window.history` behind kit's
 * back. Create the real router with `createSvelteKitRouter` from the root layout.
 */
export const provider: Router = createBrowserRouter()
