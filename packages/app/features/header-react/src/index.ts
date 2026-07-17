/**
 * Top app-shell header — branded logo + appName on the left, slotted actions
 * (theme toggle, extra actions, user menu) on the right.
 *
 * Reproduces the byte-identical Header pattern from 9 flagship apps as a
 * single composable primitive. Pair with `@molecule/app-shell-layout-react`'s
 * `<AppShellLayout>` to assemble a full chrome.
 *
 * @example
 * ```tsx
 * import { AppHeader } from '@molecule/app-header-react'
 * import { UserMenu } from '@molecule/app-ui-react'
 *
 * function Shell() {
 *   // UserMenu takes the settings panel as CHILDREN (no renderPanel prop);
 *   // panel content dismisses the drawer via usePanelClose().
 *   return (
 *     <AppHeader
 *       appName="Bearing"
 *       userMenu={
 *         <UserMenu>
 *           <div>Your settings panel here</div>
 *         </UserMenu>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Must render inside a `react-router-dom` router — the brand link is a
 *   `<Link>` and throws outside a Router context.
 * - The DEFAULT `themeToggle` slot renders `<ThemeToggle />` (which calls
 *   `useTheme()` + `useTranslation()`) ONLY when `@molecule/app-react`'s
 *   `ThemeProvider` + `I18nProvider` are both mounted above the header — it
 *   probes their contexts first. Without those providers the toggle is
 *   silently OMITTED instead of throwing, so `<AppHeader appName="…" />`
 *   renders out of the box; it lights up automatically once they are wired.
 *   Pass `themeToggle={null}` to force-hide it, or your own node to override.
 * - `fixed` defaults to `true` (`cm.headerFixed` positions the header fixed):
 *   give the page content a matching top offset (flagships get it from
 *   `<AppShellLayout>`), or pass `fixed={false}` for an in-flow header.
 * - `logoSrc` defaults to `/logo.svg`, the file mlcl scaffolds into `public/`.
 * - Styling routes through ClassMap tokens (`cm.headerBar`, `cm.headerFixed`,
 *   `cm.headerInner`, `cm.logoText`) — requires a bonded ClassMap.
 *
 * @module
 */
export * from './AppHeader.js'
