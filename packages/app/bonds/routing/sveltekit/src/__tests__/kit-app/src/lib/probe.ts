/**
 * The hand-off the URL-backed list cases make to the pages of the test app: the case puts
 * the declarations it is about to use on `window` BEFORE kit starts (`startKit` resets the
 * module registry, so module state would not survive), the root layout puts its router
 * there, and the probe pages read both at render time.
 *
 * @module
 */

import type {
  QueryParams,
  RouteDefinition,
  RouteParams,
  Router,
  SignInRequiredHttpSource,
  SignInRequiredSessionSource,
} from '@molecule/app-routing'

import type { SvelteKitNavigation } from '../../../../types.js'

/** One declared list view, in React's `ListRouteNavItem` spelling with a text label. */
export interface ProbeSelection {
  /** Absolute route pattern, such as `/probe/shelves/:shelf`. */
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
export interface ProbeLinkState {
  /** The app-owned selection key. */
  selection: string
  /** Whether the current URL selects this view. */
  active: boolean
  /** Whether navigation is disabled for this choice. */
  disabled: boolean
}

/** Everything a probe page renders, as the case declares it. */
export interface ProbeScenario {
  /** The navigation landmark's accessible name. */
  ariaLabel: string
  /** A native `id` for the navigation landmark. */
  navId?: string
  /** Every declared view; labels and destinations share one declaration. */
  selections: Record<string, ProbeSelection>
  /** Tie-breaker or fallback selection. */
  defaultSelection?: string
  /** The pagination query key, defaulting to `page`. */
  pageParam?: string
  /** List markup classes. */
  list?: { className?: string; itemClassName?: string }
  /** App-owned link styling. */
  linkClassName?: string | ((state: ProbeLinkState) => string | undefined)
  /** Rows a selection renders, by selection key (the `children` branch). */
  rows?: Record<string, string>
  /**
   * A collection request to render from, as React's `useQuery` does: called with whether
   * the saved view is selected, its answer rendered as a list.
   */
  read?: (saved: boolean) => Promise<string[]>
  /** The local panel's initial text (default `preview`). */
  initialPanel?: string
  /** The local panel's text once the button is clicked (default `details`). */
  nextPanel?: string
  /** Whether the button shows the panel's text, as React's query page does. */
  buttonShowsPanel?: boolean
}

declare global {
  interface Window {
    /** The scenario the current probe page renders. */
    __moleculeProbe?: ProbeScenario
    /** The router the test app's root layout built over kit's client router. */
    __moleculeProbeRouter?: Router
    /** Named routes the next started app's provider is created with. */
    __moleculeProbeProviderRoutes?: RouteDefinition[]
    /** Every router the started app's provider passed to `onRouterReady`, in order. */
    __moleculeProbeReady?: Router[]
    /** Whether the next started app renders the hook readers below its provider. */
    __moleculeHooksProbe?: boolean
    /** The navigation pieces the layout built, for a probe page that mounts its own provider. */
    __moleculeProbeNavigation?: SvelteKitNavigation
    /** Every router the callback probe page's provider passed to each callback. */
    __moleculeCallbackProbe?: { first: Router[]; second: Router[] }
    /** The clients and sign-in path the next started app's layout bonds and passes on. */
    __moleculeSignInProbe?: SignInProbe
  }
}

/**
 * What a sign-in case hands the next started app: the fake clients its root layout bonds in
 * the app's own module graph before the provider builds the router, and the provider's
 * `signInPath`.
 */
export interface SignInProbe {
  /** The fake HTTP client. */
  http: SignInRequiredHttpSource
  /** The fake auth client, or `undefined` to leave it unbonded. */
  auth?: SignInRequiredSessionSource
  /** Whether to leave the HTTP client unbonded. */
  withoutHttp?: boolean
  /** The provider's `signInPath`. */
  signInPath?: string | false
}

/**
 * Hands a sign-in case's clients and path to the next started app.
 *
 * @param probe - The clients and path, or `undefined` to clear them.
 */
export const setSignInProbe = (probe: SignInProbe | undefined): void => {
  window.__moleculeSignInProbe = probe
}

/**
 * The sign-in case's clients and path, for the root layout.
 *
 * @returns The probe, or `undefined` when no sign-in case set one.
 */
export const signInProbe = (): SignInProbe | undefined => window.__moleculeSignInProbe

/**
 * Hands the case's scenario to the probe pages.
 *
 * @param scenario - The declarations the next started app renders.
 */
export const setProbeScenario = (scenario: ProbeScenario): void => {
  window.__moleculeProbe = scenario
}

/**
 * The scenario the current page renders.
 *
 * @returns The scenario.
 * @throws {Error} When a probe page rendered without a case having set one.
 */
export const probeScenario = (): ProbeScenario => {
  const scenario = window.__moleculeProbe
  if (!scenario) throw new Error('the probe page rendered before a case set its scenario')
  return scenario
}

/**
 * Hands the layout's router to the probe pages.
 *
 * @param router - The router the root layout built.
 */
export const setAppRouter = (router: Router): void => {
  window.__moleculeProbeRouter = router
}

/**
 * The layout's router, for the probe pages.
 *
 * @returns The router.
 * @throws {Error} When a probe page rendered before the layout built the router.
 */
export const appRouter = (): Router => {
  const router = window.__moleculeProbeRouter
  if (!router) throw new Error('the probe page rendered before the layout built the router')
  return router
}

/**
 * Tells the next started app's root layout to mount the hook readers below its provider,
 * as React's `hooks-without-provider` cases mount their `Settings` component once above
 * the routes rather than on a page of its own.
 */
export const setHooksProbe = (): void => {
  window.__moleculeHooksProbe = true
}

/**
 * Whether the started app's root layout should render the hook readers.
 *
 * @returns `true` when a case asked for them.
 */
export const hooksProbe = (): boolean => window.__moleculeHooksProbe === true

/**
 * Declares the named routes the next started app's `MoleculeRouterProvider` is created
 * with, the way React's provider takes `routes`.
 *
 * @param routes - The route definitions, or `undefined` for none.
 */
export const setProviderRoutes = (routes: RouteDefinition[] | undefined): void => {
  window.__moleculeProbeProviderRoutes = routes
}

/**
 * The named routes the started app's provider is created with.
 *
 * @returns The route definitions, or `undefined` when the case declared none.
 */
export const providerRoutes = (): RouteDefinition[] | undefined =>
  window.__moleculeProbeProviderRoutes

/**
 * Records one router the started app's provider handed to `onRouterReady`.
 *
 * @param router - The router the provider built.
 */
export const recordProviderReady = (router: Router): void => {
  const ready = window.__moleculeProbeReady ?? []
  ready.push(router)
  window.__moleculeProbeReady = ready
}

/**
 * Every router the started app's provider handed to `onRouterReady`, oldest first.
 *
 * @returns The routers.
 */
export const providerReadyCalls = (): Router[] => window.__moleculeProbeReady ?? []

/** Forgets the provider scenario and the hook-reader flag before the next started app. */
export const clearProviderProbe = (): void => {
  delete window.__moleculeProbeProviderRoutes
  delete window.__moleculeHooksProbe
  delete window.__moleculeProbeNavigation
  delete window.__moleculeCallbackProbe
  window.__moleculeProbeReady = []
}

/**
 * Hands the layout's navigation pieces to a probe page that mounts a provider of its own.
 *
 * @param navigation - The navigation the root layout built.
 */
export const setAppNavigation = (navigation: SvelteKitNavigation): void => {
  window.__moleculeProbeNavigation = navigation
}

/**
 * The navigation pieces the root layout built.
 *
 * @returns The navigation.
 * @throws {Error} When a probe page rendered before the layout built the navigation.
 */
export const appNavigation = (): SvelteKitNavigation => {
  const navigation = window.__moleculeProbeNavigation
  if (!navigation) throw new Error('the probe page rendered before the layout built the navigation')
  return navigation
}

/**
 * Records one provider callback's invocation: which of the two callbacks was mounted.
 *
 * @param which - The callback the provider was created with.
 * @param router - The router the provider built.
 */
export const recordCallbackReady = (which: 'first' | 'second', router: Router): void => {
  const calls = window.__moleculeCallbackProbe ?? { first: [], second: [] }
  calls[which].push(router)
  window.__moleculeCallbackProbe = calls
}

/**
 * The routers each provider callback received, in order.
 *
 * @param which - The callback to read.
 * @returns The routers that callback received.
 */
export const callbackReadyCalls = (which: 'first' | 'second'): Router[] =>
  window.__moleculeCallbackProbe?.[which] ?? []
