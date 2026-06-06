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
 * @module
 */

export * from './AppShellLayout.js'
