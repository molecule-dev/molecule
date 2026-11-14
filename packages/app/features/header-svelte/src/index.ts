/**
 * Svelte top app-shell header — the Svelte counterpart of
 * `@molecule/app-header-react`, with the same props and the same DOM: branded
 * logo + appName on the left, slotted actions (theme toggle, extra actions,
 * user menu) on the right.
 *
 * Reproduces the byte-identical Header pattern from 9 flagship apps as a
 * single composable primitive. Pair with `@molecule/app-shell-layout-svelte`'s
 * `AppShellLayout` to assemble a full chrome.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AppHeader } from '@molecule/app-header-svelte'
 *   import { UserMenu } from '@molecule/app-ui-svelte'
 * </script>
 *
 * <!-- UserMenu takes the settings panel as its children snippet; panel
 *      content dismisses the drawer via usePanelClose(). -->
 * <AppHeader appName="Bearing">
 *   {#snippet userMenu()}
 *     <UserMenu>
 *       <div>Your settings panel here</div>
 *     </UserMenu>
 *   {/snippet}
 * </AppHeader>
 * ```
 *
 * @remarks
 * - Must render inside `@molecule/app-svelte`'s router context
 *   (`setMoleculeContext({ router })`) — the brand link navigates through it,
 *   exactly as the React header requires a `react-router-dom` router.
 * - The DEFAULT `themeToggle` slot renders `<ThemeToggle />` (which calls
 *   `useTheme()` + `useTranslation()`) ONLY when the binding's `ThemeProvider`
 *   + `I18nProvider` are both mounted above the header — it probes their
 *   presence first. Without those providers the toggle is silently OMITTED
 *   instead of throwing, so `<AppHeader appName="…" />` renders out of the
 *   box; it lights up automatically once they are wired. Pass
 *   `themeToggle={null}` to force-hide it, or your own snippet to override.
 * - `fixed` defaults to `true` (`cm.headerFixed` positions the header fixed):
 *   give the page content a matching top offset (flagships get it from
 *   `AppShellLayout`), or pass `fixed={false}` for an in-flow header.
 * - `logoSrc` defaults to `/logo.svg`, the file mlcl scaffolds into `public/`.
 * - Styling routes through ClassMap tokens (`cm.headerBar`, `cm.headerFixed`,
 *   `cm.headerInner`, `cm.logoText`) — requires a bonded ClassMap.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
