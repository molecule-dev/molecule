/**
 * Type definitions for the SvelteKit routing provider.
 *
 * SvelteKit's client router is reachable only inside a SvelteKit app, through the virtual
 * modules `$app/navigation` and `$app/stores` (or the older `$app/stores` page store),
 * which a package cannot import. So an app passes the pieces of SvelteKit this bond needs
 * — a {@link SvelteKitNavigation} — into `createSvelteKitRouter`, and this package never
 * imports `$app/*`.
 *
 * The shapes below are written from `@sveltejs/kit` 2.63's own declarations
 * (`node_modules/@sveltejs/kit/types/index.d.ts`); each JSDoc quotes the original it
 * mirrors. They are structural stand-ins, not imports, so an app works regardless of the
 * exact kit version it has.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { RouteDefinition } from '@molecule/app-routing'

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
 * about its shape. Kit stores it inside the history entry under `sveltekit:states`
 * (`src/runtime/client/constants.js`), which is why it must be an object.
 */
export type KitPageState = object

/**
 * The subset of SvelteKit's `goto` options this bond passes
 * (`@sveltejs/kit` `types/index.d.ts`: "export function goto(url: string | URL, opts?: {
 * replaceState?: boolean | undefined; noScroll?: boolean | undefined; keepFocus?:
 * boolean | undefined; invalidateAll?: boolean | undefined; invalidate?:
 * (string | URL | ((url: URL) => boolean))[] | undefined; state?: App.PageState |
 * undefined }): Promise<void>" — the bond only ever drives `replaceState` and `state`).
 */
export interface KitGotoOptions {
  /**
   * Replace the current history entry instead of pushing a new one (kit's
   * `replaceState` option).
   */
  replaceState?: boolean

  /**
   * State to carry in the history entry, exposed as `page.state` (kit's `state` option,
   * typed `App.PageState`).
   */
  state?: KitPageState
}

/**
 * The parts of SvelteKit's `Page` (`@sveltejs/kit` `types/index.d.ts`: "export interface
 * Page<…> { url: URL; params: Params; route: { id: RouteId }; status: number; error;
 * data; state: App.PageState; form }") this bond reads: the URL for the location, the
 * params of the route kit matched, and the state carried by the navigation.
 */
export interface KitPage {
  /**
   * "The URL of the current page" (kit's `Page.url`).
   */
  url: URL

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
 * `$app/navigation` and `$app/stores` in its root layout and passes to
 * `createSvelteKitRouter`. `goto` and `page` are kit's own exports; `onNavigate` is the
 * adapter the app writes around kit's `afterNavigate` (which only runs during component
 * initialisation and cannot unsubscribe, so the adapter owns the unsubscribe contract).
 */
export interface SvelteKitNavigation {
  /**
   * SvelteKit's programmatic navigation (`$app/navigation`'s `goto`,
   * `@sveltejs/kit` `types/index.d.ts`: "Allows you to navigate programmatically to a
   * given route … Returns a Promise that resolves when SvelteKit navigates (or fails to
   * navigate, in which case the promise rejects) to the specified `url`.").
   *
   * @param url - The path to navigate to (pathname, query string and hash).
   * @param opts - `replaceState` and `state`; the bond passes nothing else.
   * @returns Kit's navigation promise.
   */
  goto(url: string, opts?: KitGotoOptions): Promise<void>

  /**
   * Kit's `page` store — `$app/stores`' `page` (`@sveltejs/kit` `types/index.d.ts`:
   * "export const page: import("svelte/store").Readable<import("@sveltejs/kit").Page>")
   * or any `Readable<Page>`-shaped store (including `$app/state`'s reactive `page`
   * wrapped in one). Read at call time for the current location and params.
   */
  page: Readable<KitPage>

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
 * {@link SvelteKitNavigation}: `goto`, `replaceState` and `afterNavigate` from
 * `$app/navigation`, and `page` from `$app/stores`.
 */
export interface SvelteKitExports extends Pick<SvelteKitNavigation, 'goto' | 'page'> {
  /**
   * Kit's `replaceState` (`@sveltejs/kit` `types/index.d.ts`: "Programmatically replace
   * the current history entry with the given `page.state`. To use the current URL, you can
   * pass `''` as the first argument."). Used to give an entry one of kit's own links
   * created a location key.
   *
   * @param url - The URL; `''` keeps the current one.
   * @param state - The entry's new `page.state`.
   */
  replaceState(url: string, state: KitPageState): void

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
}
