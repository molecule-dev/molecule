/**
 * Svelte top-level app shell layout — the Svelte counterpart of
 * `@molecule/app-shell-layout-react`, with the same props and the same DOM.
 *
 * Exports `AppShellLayout` — header + main content + footer, with the page
 * frame styled via the ClassMap bond. Apps fill the slots with their own
 * Header, Footer, and route content.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AppShellLayout } from '@molecule/app-shell-layout-svelte'
 *
 *   import AppFooter from './AppFooter.svelte'
 *   import AppHeader from './AppHeader.svelte'
 * </script>
 *
 * <AppShellLayout maxWidth="xl" mainClassName="py-8">
 *   {#snippet header()}
 *     <AppHeader appName="Bearing" />
 *   {/snippet}
 *   {#snippet footer()}
 *     <AppFooter appName="Bearing" aboutHref="https://bearing.example" />
 *   {/snippet}
 *   <!-- Main content: the routed page. -->
 *   <h1>Home</h1>
 * </AppShellLayout>
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.page` + `cm.appLayout`) —
 *   rendering throws otherwise. No i18n or router dependency; the default
 *   content slot is just the typical page — any content works.
 * - The `<main>` carries no padding by default — pass `mainClassName`
 *   (e.g. `cm.sp('py', 8)`) for vertical rhythm around routed content.
 * - Header/footer slots render as-is with no positioning — make your header
 *   sticky yourself if desired.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
