/**
 * `@molecule/app-safe-link-angular` — an in-app anchor that appends a `#top`
 * fragment when the destination matches the current path, so a same-path click
 * still produces an observable URL change. Useful for nav primitives exercised
 * by behavioural verifiers / e2e probes. Angular counterpart of
 * `@molecule/app-safe-link-react`: the same props (React names) and the same
 * DOM for the same input.
 *
 * Note: "safe" refers to dead-link-probe safety only — this adds NO security
 * behavior (no `rel="noopener"`, no URL allowlisting). All other attributes
 * pass through unchanged.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SafeLink } from '@molecule/app-safe-link-angular'
 *
 * @Component({
 *   selector: 'app-nav',
 *   standalone: true,
 *   imports: [SafeLink],
 *   template: `<a mol-safe-link to="/dashboard">Dashboard</a>`,
 * })
 * export class NavComponent {}
 * ```
 *
 * @remarks
 * - Must render inside the molecule router (`provideRouter` /
 *   `provideMolecule({ router })`) — `useLocation()` throws otherwise. The
 *   click rules are `followRouterLink` from `@molecule/app-routing`, the rule
 *   the binding's `Link` follows (react-router `<Link>`'s contract). Do not
 *   use in apps on a different router.
 * - `to` accepts a string path only (no partial-Path objects); the link's
 *   content is the element's default projection.
 * - Use the NAMED import (`import { SafeLink } from …`); the package barrel
 *   does not re-export the file's default export.
 * - Internal routes only — for external URLs use a plain `<a>` (with
 *   `rel="noopener noreferrer"` when `target="_blank"`).
 *
 * @module
 */

export * from './safe-link.component.js'
export * from './types.js'
