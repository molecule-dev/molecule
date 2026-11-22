/**
 * Type definitions for the SvelteKit routing provider.
 *
 * SvelteKit's client router is reachable only inside a SvelteKit app, through the virtual
 * modules `$app/navigation`, `$app/state` and `$app/paths`, which a package cannot
 * import. So an app passes the pieces of SvelteKit this bond needs — a
 * {@link SvelteKitNavigation} — into `createSvelteKitRouter`, and this package never
 * imports `$app/*`.
 *
 * The shapes below are written from `@sveltejs/kit` 3's own declarations
 * (`types/index.d.ts`); each JSDoc quotes the original it mirrors. They are structural,
 * not imports, so kit's own exports are assignable to them.
 *
 * @module
 */

import type { RouteDefinition, Router } from '@molecule/app-routing'

// Re-export core types
export type {
  GuardResult,
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
  RouterConfig,
} from '@molecule/app-routing'

/**
 * The state object SvelteKit keeps in a history entry and exposes as `page.state`.
 *
 * Mirrors kit's `App.PageState` — `@sveltejs/kit` `types/index.d.ts`: "export interface
 * PageState {}", an empty interface apps extend — so it is typed as `object`: every
 * object an app declares for `App.PageState` is assignable, and nothing else is assumed
 * about its shape. Kit stores it inside the history entry, in the `state` of the
 * `sveltekit:metadata` record (`src/runtime/client/client.js`), which is why it must be
 * an object.
 */
export type KitPageState = object

/**
 * The subset of SvelteKit's `GotoOptions` this bond passes (`@sveltejs/kit`
 * `types/index.d.ts`: "export function goto(url: string | URL, opts?: GotoOptions):
 * Promise<void>"; the bond only ever drives `replace`, `state` and `persistState`).
 */
export interface KitGotoOptions {
  /**
   * "If `true`, replaces the current history entry rather than creating a new one"
   * (kit's `GotoOptions.replace`).
   */
  replace?: boolean

  /**
   * "An optional object that will be available as `page.state`" (kit's
   * `GotoOptions.state`, typed `App.PageState`).
   */
  state?: KitPageState

  /**
   * "If `true`, `page.state` will be restored after a full page reload" (kit's
   * `GotoOptions.persistState`).
   */
  persistState?: boolean
}

/**
 * The parts of the page URL this bond reads. Kit's `page.url` is read-only (`@sveltejs/kit`
 * `types/index.d.ts`: "export type ReadonlyURL = Readonly<Omit<URL, 'searchParams'> & {
 * searchParams: ReadonlyURLSearchParams }>"), so the bond asks for no more than it reads;
 * a `URL` fits as well.
 */
export interface KitUrl {
  /** The URL's path, with kit's base path when the app has one. */
  readonly pathname: string
  /** The URL's query string, `?` included (or `''`). */
  readonly search: string
  /** The URL's fragment, `#` included (or `''`); the in-app path under hash routing. */
  readonly hash: string
}

/**
 * The parts of SvelteKit's `Page` (`@sveltejs/kit` `types/index.d.ts`: "export interface
 * Page<…> { url: ReadonlyURL & …; params: Params; route: { id: RouteId }; status: number;
 * error; data; state: App.PageState; form }") this bond reads: the URL for the location,
 * the params of the route kit matched, and the state carried by the navigation.
 */
export interface KitPage {
  /**
   * "The URL of the current page" (kit's `Page.url`).
   */
  url: KitUrl

  /**
   * "The parameters of the current page - e.g. for a route like `/blog/[slug]`, a
   * `{ slug: string }` object" (kit's `Page.params`).
   */
  params: Record<string, string>

  /**
   * "The page state, which can be manipulated using the `pushState` and `replaceState`
   * functions from `$app/navigation`" (kit's `Page.state`, typed `App.PageState`).
   */
  state: KitPageState
}

/**
 * SvelteKit's navigation kinds (`@sveltejs/kit` `types/index.d.ts`: "export type
 * NavigationType = 'enter' | 'form' | 'leave' | 'link' | 'goto' | 'popstate'").
 */
export type KitNavigationType = 'enter' | 'form' | 'leave' | 'link' | 'goto' | 'popstate'

/**
 * What a {@link KitNavigateListener} hears each time kit's `page` moves to a new URL or a new
 * `page.state`: the kind of navigation kit was making then.
 */
export interface KitPageChange {
  /**
   * Kit's navigation kind (`$app/state`'s `navigating.type`), or `null` when kit changed its
   * page outside a navigation: following a link to a hash on the same page, `pushState` or
   * `replaceState` from `$app/navigation`, or a back/forward move between such entries.
   */
  type: KitNavigationType | null
}

/**
 * The part of kit's `navigating` (`$app/state`) this bond reads (`@sveltejs/kit`
 * `types/index.d.ts`: "A read-only object representing an in-progress navigation, with
 * `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties. Values are `null`
 * when no navigation is occurring").
 */
export interface KitNavigating {
  /** The kind of the navigation in flight, or `null` when none is. */
  readonly type: KitNavigationType | null
}

/**
 * A listener the {@link SvelteKitNavigation.onNavigate} adapter calls each time kit's `page`
 * moves to a new URL or a new `page.state`, before kit renders the page for it.
 */
export type KitNavigateListener = (change: KitPageChange) => void

/**
 * The subset of SvelteKit's client router this bond drives — what an app builds from
 * `$app/navigation`, `$app/state` and `$app/paths` in its root layout and passes to
 * `createSvelteKitRouter`. `goto` and `page` are kit's own exports and `rootHref` is
 * kit's `resolve('/')`; `onNavigate` tells the router when kit's `page` changed.
 * `createSvelteKitNavigation` builds all four from kit's exports.
 */
export interface SvelteKitNavigation {
  /**
   * SvelteKit's programmatic navigation (`$app/navigation`'s `goto`, `@sveltejs/kit`
   * `types/index.d.ts`: "Allows you to navigate programmatically to a given route …
   * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in
   * which case the promise rejects) to the specified `url`.").
   *
   * @param url - The URL to navigate to, with the app's base (or `#`) first.
   * @param opts - `replace`, `state` and `persistState`; the bond passes nothing else.
   * @returns Kit's navigation promise.
   */
  goto(url: string, opts?: KitGotoOptions): Promise<void>

  /**
   * Kit's `page` — `$app/state`'s `page` (`@sveltejs/kit` `types/index.d.ts`: "A read-only
   * reactive object with information about the current page … In the browser, the values
   * can be read at any time"). Read at call time for the current location and params.
   */
  page: KitPage

  /**
   * The href of the app's root, kit's `resolve('/')` from `$app/paths`: `'/'`,
   * `'/app/'` under `paths.base: '/app'`, or `'#/'` under `router: { type: 'hash' }`
   * (`resolve` "prefix[es] it with the base path, if any … In hash routing mode, the
   * returned URL starts with `#`"). Kit's `goto` does not add the base itself ("if you've
   * set `config.paths.base` and the URL is root-relative, you need to prepend the base
   * path"), so the bond puts this prefix before every path it navigates to or links.
   */
  rootHref: string

  /**
   * Calls `listener` each time kit's `page` moves to a new URL or a new `page.state`, before
   * kit renders the page for it. `createSvelteKitNavigation` watches kit's `page` once and
   * passes each change to every listener, so the router can listen and stop listening
   * repeatedly.
   *
   * @param listener - Called once per change of kit's page.
   * @returns A function that stops the listener.
   */
  onNavigate(listener: KitNavigateListener): () => void
}

/**
 * Kit's own exports that `createSvelteKitNavigation` turns into a
 * {@link SvelteKitNavigation}: `goto` from `$app/navigation`, `page` and `navigating` from
 * `$app/state`, and `rootHref` from `$app/paths`' `resolve('/')`.
 */
export interface SvelteKitExports extends Pick<SvelteKitNavigation, 'goto' | 'page' | 'rootHref'> {
  /**
   * Kit's `navigating` (`$app/state`). Read when kit's `page` changes, so a back or forward
   * move is heard as a pop.
   */
  navigating: KitNavigating
}

/**
 * Options for `createSvelteKitRouter`.
 */
export interface SvelteKitRouterOptions {
  /**
   * Route definitions for named routes and route params, exactly as the core
   * `createHistoryRouter` takes them.
   */
  routes?: RouteDefinition[]

  /**
   * Called once, with the router just built, the way React's `MoleculeRouterProvider` calls
   * `onRouterReady` once when it mounts. An app whose layout needs the router elsewhere (to
   * hand it to `setMoleculeContext` or `setRouter`, or to read a guard) gets it here instead of
   * building a second router for it.
   *
   * @param router - The router `createSvelteKitRouter` built.
   */
  onRouterReady?: (router: Router) => void

  /**
   * Path to replace the current location with on a signed-out GET 401. Defaults to
   * `/login`; `false` turns the redirect off.
   */
  signInPath?: string | false
}
