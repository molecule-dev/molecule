/**
 * Angular detail-page layout scaffold.
 *
 * Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column +
 * optional sidebar]. All regions are projected slots. It is the Angular
 * counterpart of `@molecule/app-detail-page-layout-react`: same props and
 * the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { DetailPageLayout } from '@molecule/app-detail-page-layout-angular'
 * import { Breadcrumb } from '@molecule/app-breadcrumb-angular'
 * import { DetailHeader } from '@molecule/app-detail-header-angular'
 *
 * interface Recipe {
 *   title: string
 *   relatedIds: string[]
 * }
 *
 * @Component({
 *   selector: 'recipe-page',
 *   standalone: true,
 *   imports: [DetailPageLayout, Breadcrumb, DetailHeader],
 *   template: `
 *     <div mol-detail-page-layout sidebarPosition="right" sidebarWidth="md" dataMolId="recipe-detail">
 *       <app-breadcrumb slot="breadcrumb" [items]="crumbs" />
 *       <app-detail-header slot="topBar" [title]="recipe.title" sticky />
 *       <app-recipe-sections slot="main" [recipe]="recipe" />
 *       <app-related-recipes slot="sidebar" [ids]="recipe.relatedIds" />
 *     </div>
 *   `,
 * })
 * export class RecipePage {
 *   readonly crumbs = [
 *     { label: 'Recipes', href: '/recipes' },
 *     { label: 'Tomato soup', href: '/recipes/tomato-soup' },
 *   ]
 *   readonly recipe: Recipe = { title: 'Tomato soup', relatedIds: ['r2', 'r3'] }
 * }
 * ```
 *
 * @remarks
 * - The layout itself does NOT make `topBar` sticky — it just stacks the
 *   regions. Use a slot component that brings its own stickiness (e.g.
 *   `<app-detail-header sticky>`), or wrap your top bar in a sticky container.
 * - `sidebarWidth` presets are fixed flex-basis widths: sm = 256px,
 *   md = 320px, lg = 384px. There is no built-in responsive collapse —
 *   hide the sidebar yourself on narrow viewports if needed.
 * - `RecipeSections` and `RelatedRecipes` above are your own app
 *   components — any content works in the slots (`[slot=breadcrumb]`,
 *   `[slot=topBar]`, `[slot=main]`, `[slot=sidebar]`).
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup).
 *
 * @module
 */

export * from './detail-page-layout.component.js'
export * from './types.js'
