/**
 * `@molecule/app-safe-link-vue` — a `<Link>` wrapper that appends a `#top`
 * fragment when the destination matches the current path, so a same-path click
 * still produces an observable URL change. Useful for nav primitives exercised
 * by behavioural verifiers / e2e probes. Vue counterpart of
 * `@molecule/app-safe-link-react`: the same props (React names) and the same
 * DOM for the same input.
 *
 * Note: "safe" refers to dead-link-probe safety only — this adds NO security
 * behavior (no `rel="noopener"`, no URL allowlisting). All other `Link`
 * attributes pass through unchanged.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { SafeLink } from '@molecule/app-safe-link-vue'
 *
 * const NavItem = defineComponent({
 *   setup() {
 *     return () => h(SafeLink, { to: '/dashboard' }, () => 'Dashboard')
 *   },
 * })
 *
 * createApp(NavItem).mount('#app')
 * ```
 *
 * @remarks
 * - Must render inside the molecule router (`createRouterPlugin` /
 *   `moleculePlugin` with a `router`) — `useLocation()` throws otherwise.
 *   The click rules are the binding `Link`'s
 *   (`followRouterLink` from `@molecule/app-routing`), react-router
 *   `<Link>`'s contract. Do not use in apps on a different router.
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
