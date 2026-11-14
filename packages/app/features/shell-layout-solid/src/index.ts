/**
 * Solid top-level app shell layout.
 *
 * Exports `AppShellLayout` — the Solid counterpart of
 * `@molecule/app-shell-layout-react` with the same props and the same DOM:
 * header slot + main content (constrained by a Container) + footer slot,
 * with the page frame styled via the ClassMap bond. Apps fill the slots
 * with their own Header, Footer, and route content.
 *
 * @example
 * ```tsx
 * import { AppShellLayout } from '@molecule/app-shell-layout-solid'
 * import { AppFooter } from '@molecule/app-footer-solid'
 * import { AppHeader } from '@molecule/app-header-solid'
 *
 * export function Shell() {
 *   return (
 *     <AppShellLayout
 *       header={<AppHeader appName="Bearing" />}
 *       footer={<AppFooter appName="Bearing" aboutHref="https://example.com" />}
 *       maxWidth="xl"
 *     >
 *       <main>…routed content…</main>
 *     </AppShellLayout>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.page` + `cm.appLayout`) —
 *   rendering throws otherwise. No i18n or router dependency; the routed
 *   outlet is just the typical child — any content works.
 * - The `<main>` carries no padding by default — pass `mainClassName`
 *   (e.g. `cm.sp('py', 8)`) for vertical rhythm around routed content.
 * - Header/footer slots render as-is with no positioning — make your header
 *   sticky yourself if desired.
 * - Sibling: `@molecule/app-sidebar-layout-solid` is the left-sidebar shell;
 *   THIS package is the top header/footer shell.
 *
 * @module
 */

export * from './AppShellLayout.jsx'
export * from './types.js'
