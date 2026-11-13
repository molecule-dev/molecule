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
 * Creates a Next.js App Router adapter from a config snapshot.
 *
 * Prefer {@link useMoleculeRouter} inside a React app: it builds one router whose
 * location follows the `next/navigation` hooks across navigations, while a router from
 * `createNextRouter` stays at the config's location — its `subscribe` still hears every
 * navigation this router starts (guards included), but a Next `<Link>` click or the
 * back button cannot reach it, because nothing re-renders the snapshot.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
 * import { createNextRouter, setRouter } from '@molecule/app-routing-next'
 *
 * function RouterProvider({ children }) {
 *   const navigation = useRouter()
 *   const pathname = usePathname()
 *   const searchParams = useSearchParams()
 *   const params = useParams()
 *
 *   const router = useMemo(() => createNextRouter({
 *     navigation,
 *     pathname,
 *     searchParams: Object.fromEntries(searchParams),
 *     params,
 *   }), [navigation, pathname, searchParams, params])
 *
 *   useEffect(() => {
 *     setRouter(router)
 *   }, [router])
 *
 *   return children
 * }
 * ```
 * @param config - Configuration with Next.js's `navigation` (from `useRouter()`), `pathname`, `searchParams`, `params`, and optional `routes`.
 * @returns A molecule `Router` over that config snapshot, with navigation, guards, query/hash management, and route matching.
 */
export const createNextRouter = (config: NextRouterConfig = {}): Router =>
  createHistoryRouter(createNextSnapshotHistory(config), { routes: config.routes })

/**
 * Default Next.js router provider (basic, no hooks). For full functionality, use
 * `useMoleculeRouter` (or `createNextRouter` with `useRouter`/`usePathname`/`useSearchParams`/`useParams`).
 */
export const provider: Router = createNextRouter()
