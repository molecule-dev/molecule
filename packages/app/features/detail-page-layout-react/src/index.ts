/**
 * React detail-page layout scaffold.
 *
 * Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column +
 * optional sidebar]. All regions are ReactNode slots.
 *
 * @example
 * ```tsx
 * import { DetailPageLayout } from '@molecule/app-detail-page-layout-react'
 * import { Breadcrumb } from '@molecule/app-breadcrumb-react'
 * import { DetailHeader } from '@molecule/app-detail-header-react'
 *
 * <DetailPageLayout
 *   breadcrumb={<Breadcrumb items={crumbs} />}
 *   topBar={<DetailHeader title={recipe.title} actions={editButton} sticky />}
 *   main={<RecipeSections recipe={recipe} />}
 *   sidebar={<RelatedRecipes ids={recipe.relatedIds} />}
 *   sidebarPosition="right"
 *   sidebarWidth="md"
 *   dataMolId="recipe-detail"
 * />
 * ```
 *
 * @remarks
 * - The layout itself does NOT make `topBar` sticky — it just stacks the
 *   regions. Use a slot component that brings its own stickiness (e.g.
 *   `<DetailHeader sticky>`), or wrap your top bar in a sticky container.
 * - `sidebarWidth` presets are fixed flex-basis widths: sm = 256px,
 *   md = 320px, lg = 384px. There is no built-in responsive collapse —
 *   hide the sidebar yourself on narrow viewports if needed.
 * - `RecipeSections` and `RelatedRecipes` above are your own app
 *   components — any ReactNode works in the slots.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup).
 *
 * @module
 */

export * from './DetailPageLayout.js'
