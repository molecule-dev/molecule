/**
 * Top app-shell header — branded logo + appName on the left, slotted actions
 * (theme toggle, extra actions, user menu) on the right.
 *
 * The Solid counterpart of `@molecule/app-header-react` — the same props and
 * the same DOM for the same input, with the brand link wired to the
 * `@molecule/app-solid` router instead of react-router. Pair with
 * `@molecule/app-shell-layout-solid`'s `<AppShellLayout>` to assemble a full
 * chrome.
 *
 * @example
 * ```tsx
 * import { AppHeader } from '@molecule/app-header-solid'
 * import { UserMenu } from '@molecule/app-ui-solid'
 *
 * function Shell() {
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
 * - Must render inside a `MoleculeProvider` whose config wires `router` —
 *   the brand link navigates through the binding's router and throws
 *   outside it.
 * - The DEFAULT `themeToggle` slot renders `<ThemeToggle />` (which calls
 *   `useTheme()` + `useTranslation()`) ONLY when `@molecule/app-solid`'s
 *   theme + i18n services are both wired above the header — it probes their
 *   contexts first. Without them the toggle is silently OMITTED instead of
 *   throwing, so `<AppHeader appName="…" />` renders out of the box; it
 *   lights up automatically once they are wired. Pass `themeToggle={null}`
 *   to force-hide it, or your own node to override.
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
export * from './types.js'
