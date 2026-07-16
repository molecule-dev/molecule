/**
 * `@molecule/app-safe-link-react` — react-router `<Link>` wrapper that
 * appends a `#top` fragment when the destination matches the current path,
 * so a same-path click still produces an observable URL change. Useful for
 * nav primitives exercised by behavioural verifiers / e2e probes.
 *
 * Note: "safe" refers to dead-link-probe safety only — this adds NO security
 * behavior (no `rel="noopener"`, no URL allowlisting). All other `Link`
 * props pass through unchanged.
 *
 * @example
 * ```tsx
 * import { SafeLink } from '@molecule/app-safe-link-react'
 *
 * function NavItem() {
 *   return <SafeLink to="/dashboard">Dashboard</SafeLink>
 * }
 * ```
 *
 * @remarks
 * - Must render inside a react-router `<Router>` / `RouterProvider` —
 *   `useLocation()` throws otherwise. Peer-depends on `react-router-dom`
 *   v6/v7; do not use in apps on a different router.
 * - `to` accepts a string path only (no partial-Path objects).
 * - Use the NAMED import (`import { SafeLink } from …`); the package barrel
 *   does not re-export the file's default export.
 * - Internal routes only — for external URLs use a plain `<a>` (with
 *   `rel="noopener noreferrer"` when `target="_blank"`).
 *
 * @module
 */

export * from './SafeLink.js'
