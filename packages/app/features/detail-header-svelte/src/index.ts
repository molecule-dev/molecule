/**
 * Svelte detail-page header — the Svelte counterpart of
 * `@molecule/app-detail-header-react`, with the same props and the same DOM.
 *
 * Exports `DetailHeader` — leading slot + title/subtitle + status +
 * right-aligned actions, with an optional meta row and an optional search
 * slot. Different from `<PageHeader>` (top of list/index pages) in
 * prioritising status + search + stickiness for long-scrolling detail
 * screens. All slots are snippet props — compose any components.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { DetailHeader } from '@molecule/app-detail-header-svelte'
 *   import { Button } from '@molecule/app-ui-svelte'
 *   import { StatusBadge } from '@molecule/app-status-badge-svelte'
 * </script>
 *
 * <DetailHeader
 *   title="Project Alpha"
 *   subtitle="Last updated 2 hours ago"
 *   sticky
 * >
 *   {#snippet status()}
 *     <StatusBadge kind="success">Active</StatusBadge>
 *   {/snippet}
 *   {#snippet actions()}
 *     <Button variant="solid" onclick={handleEdit}>Edit</Button>
 *   {/snippet}
 *   {#snippet meta()}
 *     <span>Owner: Alice</span>
 *   {/snippet}
 * </DetailHeader>
 * ```
 *
 * @remarks
 * - `sticky` applies `position: sticky; top: 0` but adds NO background —
 *   pass a surface class via `className` (e.g. your ClassMap's surface
 *   helper) or content will scroll visibly through the header.
 * - There is no breadcrumb prop; put a breadcrumb in the `leading` snippet
 *   or render one above the header (see
 *   `@molecule/app-detail-page-layout-react`, which has a breadcrumb slot).
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own, so no locale
 *   bond is needed; translate the values you pass in.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
