/**
 * React detail-page layout scaffold.
 *
 * Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column + optional sidebar].
 *
 * @example
 * ```tsx
 * import { DetailPageLayout } from '@molecule/app-detail-page-layout-react'
 *
 * <DetailPageLayout
 *   breadcrumb={<Breadcrumb items={crumbs} />}
 *   topBar={<PageTitle title={recipe.title} actions={<EditButton />} />}
 *   main={<RecipeSections recipe={recipe} />}
 *   sidebar={<RelatedRecipes ids={recipe.relatedIds} />}
 *   sidebarPosition="right"
 *   sidebarWidth="md"
 *   dataMolId="recipe-detail"
 * />
 * ```
 *
 * @module
 */

export * from './DetailPageLayout.js'
