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
 *
 * @example
 * ```ts
 * import { createBrowserRouter, setRouter, navigate, getParams, getQuery } from '@molecule/app-routing'
 *
 * // Wire the router ONCE at app startup (before any navigate/getParams call):
 * setRouter(
 *   createBrowserRouter({
 *     routes: [
 *       { path: '/', name: 'home' },
 *       { path: '/projects/:id', name: 'project', requiresAuth: true },
 *     ],
 *   }),
 * )
 *
 * // Navigate in-app (SPA — no full reload). `replace` skips a history entry.
 * navigate('/projects/42')
 * navigate('/login', { replace: true, state: { from: '/projects/42' } })
 *
 * // Read the current route's params + query string anywhere:
 * const { id } = getParams<{ id: string }>() // '42' on /projects/:id
 * const query = getQuery() // { sort: 'recent' } on ?sort=recent
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './router.js'
export * from './types.js'
export * from './utilities.js'
