/**
 * `@molecule/app-safe-link-react` — `<Link>` wrapper that
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
 * - Must render inside the app's router (`RouterProvider`) — `useLocation()`
 *   throws otherwise. Imports its `Link` and `useLocation` from
 *   `@molecule/app-react` / `@molecule/app-react/link`, so it works under every
 *   routing bond and peer-depends on `@molecule/app-react`.
 * - `to` accepts a string path only (no partial-Path objects).
 * - Use the NAMED import (`import { SafeLink } from …`); the package barrel
 *   does not re-export the file's default export.
 * - Internal routes only — for external URLs use a plain `<a>` (with
 *   `rel="noopener noreferrer"` when `target="_blank"`).
 *
 * @module
 */

export * from './SafeLink.js'
export * from './types.js'
