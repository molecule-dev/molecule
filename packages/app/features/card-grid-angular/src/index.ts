/**
 * Angular card-grid and bento-grid layouts.
 *
 * Exports:
 * - `<CardGrid>` — responsive grid with configurable column count.
 * - `<BentoGrid>` — col/row-span or named-areas layout for mixed-size cards.
 *
 * This is the Angular counterpart of `@molecule/app-card-grid-react`: the same
 * exports, the same props (React names), and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { BentoGrid, CardGrid } from '@molecule/app-card-grid-angular'
 *
 * @Component({
 *   selector: 'app-grids',
 *   standalone: true,
 *   imports: [CardGrid, BentoGrid],
 *   template: `
 *     <div mol-card-grid [columns]="3" gap="md">
 *       <app-product-card [product]="products[0]" />
 *       <app-product-card [product]="products[1]" />
 *       <app-product-card [product]="products[2]" />
 *     </div>
 *
 *     <div mol-bento-grid [items]="bentoItems"></div>
 *   `,
 * })
 * export class Grids {
 *   readonly products = [
 *     { id: 'p1', name: 'Mug' },
 *     { id: 'p2', name: 'Lamp' },
 *     { id: 'p3', name: 'Chair' },
 *   ]
 *   readonly hero = 'Hero card'
 *   readonly stats = 'Stats card'
 *   bentoItems = [
 *     { id: 'hero', content: this.hero, colSpan: 8, rowSpan: 2 },
 *     { id: 'stats', content: this.stats, colSpan: 4 },
 *   ]
 * }
 * ```
 *
 * @remarks
 * `CardGrid` collapses to one column on narrow viewports and grows to
 * `columns` (1–6) at the md+ breakpoint via the ClassMap grid. In
 * `BentoGrid`, span mode uses a `columns`-wide grid (default 12) with
 * per-item `colSpan`/`rowSpan`; passing `areas` switches to named
 * `grid-template-areas` — then every item must set a matching `area`
 * token or it falls out of the template. Node values are projected content:
 * `CardGrid`'s cards are the element's default content, and a
 * `BentoItem.content` is an `ng-template` reference or text.
 *
 * @module
 */

export * from './bento-grid.component.js'
export * from './card-grid.component.js'
export * from './types.js'
