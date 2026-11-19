/**
 * Next.js App Router provider implementation.
 *
 * `createNextRouter` supplies only a {@link RouterHistory} over the Next client surface
 * handed in through the config — location from the `pathname`/`searchParams` snapshot
 * plus the document hash, navigation through `navigation.push`/`replace`, notifications
 * right after each navigation it starts — and gets the whole `Router` from the core
 * `createHistoryRouter`, exactly like every other routing bond. The React path
 * (`useMoleculeRouter`) is the one real apps should use: it keeps ONE live router whose
 * location follows Next's hooks across navigations, while this factory's router is a
 * snapshot of the one location the config holds.
 *
 * @module
 */

import type { Router } from '@molecule/app-routing'
import { createHistoryRouter } from '@molecule/app-routing'

import { createNextSnapshotHistory } from './history.js'
import type { NextRouterConfig } from './types.js'

/**
 * Creates a Next.js App Router adapter over one fixed config snapshot: for code that runs
 * outside a component's render cycle, such as a test or a server render.
 *
 * In a React app use {@link useMoleculeRouter}: it builds one router for the component's
 * life, whose location follows the `next/navigation` hooks across navigations. A router
 * from `createNextRouter` stays at the config's location — its `subscribe` still hears
 * every navigation this router starts (guards included), but a Next `<Link>` click or the
 * back button cannot reach it, and rebuilding it on every render (in a `useMemo` over the
 * hook values) drops its subscribers, its guards and the state of a navigation it started,
 * which reaches the new history entry only once Next has committed it.
 *
 * @example
 * ```ts
 * import { createNextRouter } from '@molecule/app-routing-next'
 *
 * const router = createNextRouter({
 *   pathname: '/orders',
 *   searchParams: { page: '2' },
 *   params: {},
 *   routes: [{ path: '/orders/:id', name: 'order' }],
 * })
 *
 * router.getQueryParam('page') // '2'
 * router.generatePath('order', { id: '7' }) // '/orders/7'
 * ```
 * @param config - Configuration with Next.js's `navigation` (from `useRouter()`), `pathname`, `searchParams`, `params`, `basePath`, and optional `routes`.
 * @returns A molecule `Router` over that config snapshot, with navigation, guards, query/hash management, and route matching.
 */
export const createNextRouter = (config: NextRouterConfig = {}): Router =>
  createHistoryRouter(createNextSnapshotHistory(config), { routes: config.routes })

/**
 * Default Next.js router provider (basic, no hooks): with no App Router to drive, each
 * navigation is a full page load, whose new document starts with an empty history entry, so
 * a navigation's `state` cannot reach it. Mount {@link useMoleculeRouter} for client-side
 * navigation, history state and route-change notifications.
 */
export const provider: Router = createNextRouter()
