/**
 * Client-side routing interface for molecule.dev.
 *
 * Provides a unified routing API that works across different
 * routing libraries (React Router, Next.js, Vue Router, etc.).
 *
 * @remarks
 * Navigate and read the location through this abstraction ({@link navigate}, {@link getParams},
 * {@link getQuery}, or the framework hook) — do NOT `import` react-router / vue-router directly
 * or use `window.location` for in-app navigation; that couples you to one library and loses SPA
 * behavior.
 *
 * - **A {@link NavigationGuard} is UX, NOT security.** A client route guard only hides a screen
 *   — the REAL protection is your API checking auth + ownership on every request (see the
 *   `auth` skill and the database ownership rule). Never gate sensitive DATA behind a client
 *   guard alone; anyone can call the API directly or edit client state.
 * - **Never put a secret or token in a route param or query string.** URLs leak into browser
 *   history, server logs, and the `Referer` header — deliver a reset/verify token as a
 *   one-time link you validate server-side, and don't persist it client-side afterward.
 * - **`navigate()` applies ASYNCHRONOUSLY** (guards are awaited first) and returns `void`, so
 *   `getParams()`/`getQuery()` on the very next line still read the OLD route. React to route
 *   changes in `router.subscribe(...)` (or the framework hook), not right after `navigate()`.
 * - `requiresAuth`/`roles` on a route are metadata only — nothing enforces them. Redirect with
 *   `router.addGuard((to) => ...)` returning a path (and still protect the API).
 * - `getParams()` returns the params of the FIRST registered route whose pattern matches
 *   (prefix match unless `exact: true`), so a `'/projects'` route listed before
 *   `'/projects/:id'` yields `{}` — list specific routes first or mark list routes `exact`.
 * - In React Router apps use `MoleculeRouterProvider` from `@molecule/app-routing-react-router`
 *   (it calls `setRouter` for you) instead of `createBrowserRouter`.
 *
 * @example
 * ```typescript
 * import { createBrowserRouter, getParams, getQuery, navigate, setRouter } from '@molecule/app-routing'
 *
 * // Wire the router ONCE at app startup (before any navigate/getParams call):
 * const router = createBrowserRouter({
 *   routes: [
 *     { path: '/', name: 'home', exact: true },
 *     { path: '/projects/:id', name: 'project' },
 *   ],
 * })
 * setRouter(router)
 *
 * // Re-render from route changes — navigate() applies asynchronously.
 * const stop = router.subscribe((location, action) => {
 *   const { id } = getParams<{ id: string }>()
 *   const { sort } = getQuery()
 *   console.log(action, location.pathname, id, sort) // 'push' '/projects/42' '42' 'recent'
 * })
 *
 * // In-app SPA navigation (history.pushState — no reload). Build URLs from named routes:
 * navigate(router.generatePath('project', { id: '42' }, { sort: 'recent' })) // '/projects/42?sort=recent'
 *
 * // On unmount: stop()
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './router.js'
export * from './types.js'
export * from './utilities.js'
