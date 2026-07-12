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
 * @module
 */

export * from './provider.js'
export * from './router.js'
export * from './types.js'
export * from './utilities.js'
