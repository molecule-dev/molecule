/**
 * Solid card-grid and bento-grid layouts.
 *
 * Exports:
 * - `CardGrid` — responsive grid with configurable column count.
 * - `BentoGrid` — col/row-span or named-areas layout for mixed-size cards.
 *
 * This is the Solid counterpart of `@molecule/app-card-grid-react`: the same
 * exports, the same props (React names), and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { BentoGrid, CardGrid } from '@molecule/app-card-grid-solid'
 *
 * export function Grids() {
 *   return (
 *     <div>
 *       <CardGrid columns={3} gap="md">
 *         <ProductCard product={products[0]} />
 *         <ProductCard product={products[1]} />
 *         <ProductCard product={products[2]} />
 *       </CardGrid>
 *
 *       <BentoGrid
 *         items={[
 *           { id: 'hero', content: <HeroCard />, colSpan: 8, rowSpan: 2 },
 *           { id: 'stats', content: <StatsCard />, colSpan: 4 },
 *         ]}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * `CardGrid` collapses to one column on narrow viewports and grows to
 * `columns` (1–6) at the md+ breakpoint via the ClassMap grid. In
 * `BentoGrid`, span mode uses a `columns`-wide grid (default 12) with
 * per-item `colSpan`/`rowSpan`; passing `areas` switches to named
 * `grid-template-areas` — then every item must set a matching `area`
 * token or it falls out of the template.
 *
 * @module
 */

export * from './BentoGrid.jsx'
export * from './CardGrid.jsx'
export * from './types.js'
