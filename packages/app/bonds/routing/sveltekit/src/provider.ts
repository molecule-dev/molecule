/**
 * SvelteKit provider implementation for the molecule `Router`.
 *
 * `createSvelteKitRouter` supplies only a {@link RouterHistory} over SvelteKit's client
 * router — location from kit's `page` store, navigation through kit's `goto`, history
 * moves through `window.history` (kit follows popstate itself), notifications through the
 * app's `afterNavigate` adapter — and gets the whole `Router` from the core
 * `createHistoryRouter`, exactly like every other routing bond.
 *
 * @module
 */

import { get } from 'svelte/store'

import { t } from '@molecule/app-i18n'
import type { RouteLocation, Router, RouterHistory } from '@molecule/app-routing'
import {
  createBrowserRouter,
  createHistoryRouter,
  fromHistoryStateRecord,
  toHistoryStateRecord,
} from '@molecule/app-routing'

import type {
  KitAfterNavigate,
  KitNavigateListener,
  KitPage,
  KitPageState,
  SvelteKitExports,
  SvelteKitNavigation,
  SvelteKitRouterOptions,
} from './types.js'

/** The namespace kit owns inside history entries (`sveltekit:snapshot`, `sveltekit:scroll`, `sveltekit:states`, `sveltekit:pageurl`, `sveltekit:history`, `sveltekit:navigation` — `@sveltejs/kit` `src/runtime/client/constants.js:1-7`). */
const KIT_STATE_PREFIX = 'sveltekit:'

/** The history-entry counter kit writes into every entry (`sveltekit:history`, `@sveltejs/kit` `src/runtime/client/constants.js:6`); read for the per-entry location key. */
const KIT_HISTORY_INDEX = 'sveltekit:history'

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
 * Reads the history-entry counter kit writes into every entry (`sveltekit:history`,
 * `@sveltejs/kit` `src/runtime/client/constants.js:6`, set at hydration
 * `src/runtime/client/client.js:368-375` and on each commit `client.js:1827-1831`) as the
 * location key: it changes for every entry, including a pop back to a URL this router
 * visited before.
 *
 * @returns The entry key, or `undefined` outside the browser (no history) or before
 * kit's hydration `replaceState`.
 */
const entryKey = (): string | undefined => {
  const entry = typeof window === 'undefined' ? null : window.history.state
  if (entry === null || typeof entry !== 'object') return undefined
  const index = (entry as Record<string, unknown>)[KIT_HISTORY_INDEX]
  return index === undefined ? undefined : String(index)
}

/**
 * Builds the molecule `Router` over a SvelteKit app's client router.
 *
 * The app passes kit's `goto`, kit's `page` store and an `afterNavigate` adapter (see
 * {@link SvelteKitNavigation.onNavigate} and the package example) once, from the root
 * layout, and registers the result with `@molecule/app-svelte`'s `setMoleculeContext`.
 *
 * Subscribers hear exactly one call per navigation kit commits — kit links, the back
 * button, and this router's own `navigate` — because kit fires `afterNavigate` only
 * after a navigation completed (`@sveltejs/kit` `src/runtime/client/client.js:1987-1989`):
 * a navigation kit's own guards cancelled never reaches `afterNavigate`, so it never
 * notifies. The history holds no resources of its own: the kit subscription is released
 * through the unsubscribe `listen` returns.
 *
 * @param kit - The SvelteKit pieces (see {@link SvelteKitNavigation}).
 * @param options - Route definitions.
 * @returns The router.
 */
export const createSvelteKitRouter = (
  kit: SvelteKitNavigation,
  options: SvelteKitRouterOptions = {},
): Router => {
  const history: RouterHistory = {
    /** The current location, from kit's `page` store at the time of the call. */
    location(): RouteLocation {
      const page: KitPage = get(kit.page)
      return {
        pathname: page.url.pathname,
        search: page.url.search,
        hash: page.url.hash,
        state: locationState(page.state),
        key: stateKey(page.state) ?? entryKey(),
      }
    },

    /** The params of the route kit matched. */
    params: () => get(kit.page).params,

    push: (path, state) => kit.goto(path, { state: toKitState(state) }),

    replace: (path, state) => kit.goto(path, { replaceState: true, state: toKitState(state) }),

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

  return createHistoryRouter(history, { routes: options.routes })
}

/**
 * Builds the {@link SvelteKitNavigation} that `createSvelteKitRouter` takes, from kit's own
 * exports. Call it during the root layout's component initialisation, where kit allows
 * `afterNavigate`. It registers ONE `afterNavigate` callback and passes each navigation to
 * the listeners the router adds and removes, so stopping and restarting a subscription
 * never leaves a second kit callback behind (a hand-written adapter whose unsubscribe does
 * nothing would notify subscribers twice after that).
 *
 * @param kit - Kit's `goto`, `replaceState`, `page` and `afterNavigate`.
 * @returns The navigation pieces for `createSvelteKitRouter`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { afterNavigate, goto, replaceState } from '$app/navigation'
 *   import { page } from '$app/stores'
 *   import { createSvelteKitNavigation, createSvelteKitRouter } from '@molecule/app-routing-sveltekit'
 *
 *   const router = createSvelteKitRouter(createSvelteKitNavigation({ goto, replaceState, page, afterNavigate }))
 * </script>
 * ```
 */
export const createSvelteKitNavigation = (kit: SvelteKitExports): SvelteKitNavigation => {
  const listeners = new Set<KitNavigateListener>()
  kit.afterNavigate((navigation) => {
    // An entry kit created on its own (the first load, a kit link) gets a location key
    // before anyone reads the location; a popstate restores an entry that has one.
    const { state } = get(kit.page)
    if (navigation.type !== 'popstate' && stateKey(state) === undefined) {
      kit.replaceState('', { ...state, [ENTRY_KEY]: newKey() })
    }
    for (const listener of [...listeners]) listener(navigation)
  })
  return {
    goto: kit.goto,
    page: kit.page,
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
