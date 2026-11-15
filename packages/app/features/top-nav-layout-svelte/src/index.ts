/**
 * Svelte top navigation app shell layout for routed Svelte apps — the Svelte
 * counterpart of `@molecule/app-top-nav-layout-react`, with the same props
 * (React names) and the same DOM for the same input.
 *
 * Exports `TopNavLayout` — sticky header with brand link + horizontal router
 * links + a user-menu slot, plus the `<main>` holding the routed page body —
 * and the `TopNavItem` / `TopNavLayoutProps` types.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-svelte'
 *
 *   const nav: TopNavItem[] = [
 *     { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *     { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 *   ]
 * </script>
 *
 * <TopNavLayout appName="Acme" {nav}>
 *   {#snippet userMenu()}
 *     <button type="button">Account</button>
 *   {/snippet}
 *   <!-- The routed page body. -->
 *   <h1>Home</h1>
 * </TopNavLayout>
 * ```
 *
 * @remarks
 * Use it as a LAYOUT component and put the routed page in the default content:
 * React renders React Router's `<Outlet />` in the `<main>`, and this package
 * renders its `children` snippet there. Nav labels are hidden below the `md`
 * breakpoint (icon-only mobile nav), so always provide `icon` names; they
 * render as Material Symbols ligatures and need the Material Symbols font
 * loaded by the host app. Styling comes from the bonded ClassMap, so a
 * theme/ClassMap bond is a prerequisite. `label` is rendered as-is: pass an
 * already-translated string.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
