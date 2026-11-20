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
 * The parts of SvelteKit's `NavigationTarget` (`@sveltejs/kit` `types/index.d.ts`:
 * "export interface NavigationTarget<…> { params: Params | null; route: { id: RouteId |
 * null }; url: URL; scroll }") this bond reads.
 */
export interface KitNavigationTarget {
  /**
   * "Parameters of the target page … Is `null` if the target is not part of the
   * SvelteKit app" (kit's `NavigationTarget.params`).
   */
  params: Record<string, string> | null

  /**
   * "Info about the target route" — the bond reads only its nullable route id (kit's
   * `NavigationTarget.route`).
   */
  route: {
    /** The route id, `null` when no kit route matched. */
    id: string | null
  }

  /**
   * "The URL that is navigated to" (kit's `NavigationTarget.url`).
   */
  url: URL
}

/**
 * The parts of SvelteKit's `AfterNavigate` (`@sveltejs/kit` `types/index.d.ts`:
 * "export type AfterNavigate = (Navigation | NavigationEnter) & { type:
 * Exclude<NavigationType, 'leave'>; willUnload: false }", where `Navigation` carries
 * "from: NavigationTarget | null; to: NavigationTarget | null; willUnload; complete")
 * this bond reads: the navigation kind and its target.
 */
export interface KitAfterNavigate {
  /**
   * "Where navigation was triggered from" (kit's `Navigation.from`).
   */
  from: KitNavigationTarget | null

  /**
   * "Where navigation is going to/has gone to" (kit's `Navigation.to`).
   */
  to: KitNavigationTarget | null

  /**
   * "The type of navigation" (kit's `AfterNavigate.type`: every `NavigationType` except
   * `'leave'`, which unloads the page and never reaches `afterNavigate`).
   */
  type: Exclude<KitNavigationType, 'leave'>
}

/**
 * A listener the {@link SvelteKitNavigation.onNavigate} adapter calls with each
 * navigation SvelteKit committed. It receives kit's `AfterNavigate` argument, narrowed
 * to the parts the bond reads.
 */
export type KitNavigateListener = (navigation: KitAfterNavigate) => void

/**
 * The subset of SvelteKit's client router this bond drives — what an app builds from
 * `$app/navigation`, `$app/state` and `$app/paths` in its root layout and passes to
 * `createSvelteKitRouter`. `goto` and `page` are kit's own exports and `rootHref` is
 * kit's `resolve('/')`; `onNavigate` is the adapter around kit's `afterNavigate` (which
 * only runs during component initialisation and returns no unsubscribe: kit drops the
 * callback only when that component is destroyed, so the adapter owns the unsubscribe
 * contract).
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
   * An adapter around kit's `afterNavigate` that adds what kit cannot give a package:
   * an unsubscribe. `afterNavigate` "must be called during a component initialization"
   * and stays active while the component is mounted. Build this with
   * `createSvelteKitNavigation` in the root layout: it registers one `afterNavigate`
   * callback and fans it out, so the router can listen and stop listening repeatedly
   * without stacking kit callbacks.
   *
   * @param listener - Called once per committed navigation.
   * @returns A function that stops the listener.
   */
  onNavigate(listener: KitNavigateListener): () => void
}

/**
 * Kit's own exports that `createSvelteKitNavigation` turns into a
 * {@link SvelteKitNavigation}: `goto` and `afterNavigate` from `$app/navigation`, `page`
 * from `$app/state`, and `rootHref` from `$app/paths`' `resolve('/')`.
 */
export interface SvelteKitExports extends Pick<SvelteKitNavigation, 'goto' | 'page' | 'rootHref'> {
  /**
   * Kit's `afterNavigate` (`@sveltejs/kit` `types/index.d.ts`: "A lifecycle function that
   * runs the supplied `callback` when the current component mounts, and also whenever we
   * navigate to a URL. `afterNavigate` must be called during a component initialization.").
   *
   * @param callback - Called after each committed navigation.
   */
  afterNavigate(callback: KitNavigateListener): void
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
