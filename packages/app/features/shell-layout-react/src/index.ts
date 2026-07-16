/**
 * React top-level app shell layout.
 *
 * Exports `<AppShellLayout>` — header + main content + footer, with the page
 * frame styled via the ClassMap bond. Apps fill the slots with their own
 * Header, Footer, and route content (typically `<Outlet />`).
 *
 * @example
 * ```tsx
 * import { AppShellLayout } from '@molecule/app-shell-layout-react'
 * import { Outlet } from 'react-router-dom'
 *
 * import { AppFooter } from './AppFooter.js'
 * import { AppHeader } from './AppHeader.js'
 *
 * export function Shell() {
 *   return (
 *     <AppShellLayout
 *       header={<AppHeader />}
 *       footer={<AppFooter />}
 *       maxWidth="xl"
 *     >
 *       <Outlet />
 *     </AppShellLayout>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.page` + `cm.appLayout`) —
 *   rendering throws otherwise. No i18n or router dependency; `<Outlet />`
 *   is just the typical child — any content works.
 * - The `<main>` carries no padding by default — pass `mainClassName`
 *   (e.g. `cm.sp('py', 8)`) for vertical rhythm around routed content.
 * - Header/footer slots render as-is with no positioning — make your header
 *   sticky yourself if desired.
 * - Sibling: `@molecule/app-sidebar-layout-react` is the left-sidebar shell
 *   (router-coupled); THIS package is the top header/footer shell.
 *
 * @module
 */

export * from './AppShellLayout.js'
