/**
 * Svelte detail-page layout scaffold.
 *
 * Exports `DetailPageLayout` — the Svelte counterpart of
 * `@molecule/app-detail-page-layout-react`, with the same props and the same
 * DOM: breadcrumb + top bar + [main column + optional sidebar]. All regions
 * are snippet slots; apps fill them with their own cards/sections.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { DetailPageLayout } from '@molecule/app-detail-page-layout-svelte'
 *   import { Breadcrumb } from '@molecule/app-breadcrumb-svelte'
 *   import { DetailHeader } from '@molecule/app-detail-header-svelte'
 * </script>
 *
 * <DetailPageLayout
 *   sidebarPosition="right"
 *   sidebarWidth="md"
 *   dataMolId="recipe-detail"
 * >
 *   {#snippet breadcrumb()}
 *     <Breadcrumb items={crumbs} />
 *   {/snippet}
 *   {#snippet topBar()}
 *     <DetailHeader title={recipe.title} sticky />
 *   {/snippet}
 *   {#snippet main()}
 *     <RecipeSections recipe={recipe} />
 *   {/snippet}
 *   {#snippet sidebar()}
 *     <RelatedRecipes ids={recipe.relatedIds} />
 *   {/snippet}
 * </DetailPageLayout>
 * ```
 *
 * @remarks
 * - The layout itself does NOT make `topBar` sticky — it just stacks the
 *   regions. Use a snippet component that brings its own stickiness (e.g.
 *   `<DetailHeader sticky>`), or wrap your top bar in a sticky container.
 * - `sidebarWidth` presets are fixed flex-basis widths: sm = 256px,
 *   md = 320px, lg = 384px. There is no built-in responsive collapse —
 *   hide the sidebar yourself on narrow viewports if needed.
 * - `RecipeSections` and `RelatedRecipes` above are your own app
 *   components — any snippet works in the slots.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup).
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
