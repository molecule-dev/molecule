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
 * import { useTranslation } from '@molecule/app-react'
 * import { Button, usePanelClose, UserMenu } from '@molecule/app-ui-react'
 *
 * function SettingsPanel() {
 *   const { t } = useTranslation()
 *   const close = usePanelClose()
 *   return (
 *     <section>
 *       <h2>{t('settings.account', undefined, { defaultValue: 'Account' })}</h2>
 *       <Button onClick={close}>{t('common.close', undefined, { defaultValue: 'Close' })}</Button>
 *     </section>
 *   )
 * }
 *
 * export function Shell() {
 *   return (
 *     <AppHeader
 *       appName="Bearing"
 *       userMenu={
 *         <UserMenu>
 *           <SettingsPanel />
 *         </UserMenu>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Must render inside a `react-router` router (`<BrowserRouter>` /
 *   `RouterProvider`) — the brand link is a `<Link>` and throws outside a
 *   Router context (so does `<UserMenu>`, which closes itself on navigation).
 * - `<UserMenu>` takes the settings panel as CHILDREN (there is no
 *   `renderPanel` prop); the panel closes the drawer via `usePanelClose()`.
 *   `<UserMenu>` calls `useTranslation()` (needs `I18nProvider`) and renders
 *   an icon, so an icon set must be bonded (`setIconSet(iconSet)` from
 *   `@molecule/app-icons` + `@molecule/app-icons-molecule`).
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
